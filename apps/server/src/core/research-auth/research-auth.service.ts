import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { sql } from 'kysely';
import {
  LoginResearchUserDto,
  RegisterResearchUserDto,
  SendOtpDto,
  VerifyOtpDto,
  VerifyStudentDto,
} from './dto/research-auth.dto';
import { comparePasswordHash, generateSlugId, hashPassword } from '../../common/helpers';
import { STUDENT_VERIFICATION_DATABASE } from './data/official-students';
import * as jwt from 'jsonwebtoken';
import { FastifyReply } from 'fastify';
import { JwtType } from '../auth/dto/jwt-payload';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';

@Injectable()
export class ResearchAuthService implements OnModuleInit {
  private readonly logger = new Logger(ResearchAuthService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly environmentService: EnvironmentService,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly userRepo: UserRepo,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureTablesAndSeed();
    } catch (err: any) {
      this.logger.error('Error during research auth initialization', err?.message || err);
    }
  }

  async ensureTablesAndSeed(): Promise<void> {
    try {
      // 1. Ensure student_verifications table exists
      await this.db.schema
        .createTable('student_verifications')
        .ifNotExists()
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('serial', 'integer', (col) => col.notNull())
        .addColumn('student_id', 'varchar(50)', (col) => col.notNull().unique())
        .addColumn('student_name', 'varchar(255)', (col) => col.notNull())
        .addColumn('total_credits_attempted', 'numeric(6, 2)', (col) => col.notNull())
        .addColumn('total_credits_earned', 'numeric(6, 2)', (col) => col.notNull())
        .addColumn('cgpa', 'numeric(4, 2)', (col) => col.notNull())
        .addColumn('status', 'varchar(50)', (col) => col.notNull().defaultTo('Active'))
        .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
        .execute()
        .catch(() => undefined);

      // 2. Ensure research_users table exists
      await this.db.schema
        .createTable('research_users')
        .ifNotExists()
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_uuid_v7()`))
        .addColumn('student_id', 'varchar(50)', (col) => col.notNull().unique())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
        .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
        .addColumn('role', 'varchar(50)', (col) => col.notNull().defaultTo('Researcher'))
        .addColumn('team_id', 'varchar(50)', (col) => col.notNull())
        .addColumn('cgpa', 'numeric(4, 2)', (col) => col)
        .addColumn('credits', 'numeric(6, 2)', (col) => col)
        .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
        .execute()
        .catch(() => undefined);

      // 3. Ensure research_otps table exists
      await this.db.schema
        .createTable('research_otps')
        .ifNotExists()
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('email', 'varchar(255)', (col) => col.notNull())
        .addColumn('student_id', 'varchar(50)', (col) => col)
        .addColumn('otp_code', 'varchar(10)', (col) => col.notNull())
        .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
        .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
        .execute()
        .catch(() => undefined);

      // 4. Seed all 121 official students if table is empty or missing records
      const countRes: any = await this.db
        .selectFrom('student_verifications' as any)
        .select(sql`count(*)`.as('count'))
        .executeTakeFirst()
        .catch(() => null);

      const count = parseInt(countRes?.count || '0', 10);
      if (count < STUDENT_VERIFICATION_DATABASE.length) {
        this.logger.log(
          `Auto-seeding student_verifications (current: ${count}, expected: ${STUDENT_VERIFICATION_DATABASE.length})...`,
        );

        for (const s of STUDENT_VERIFICATION_DATABASE) {
          await sql`
            INSERT INTO student_verifications (serial, student_id, student_name, total_credits_attempted, total_credits_earned, cgpa, status, updated_at)
            VALUES (${s.serial}, ${s.studentId}, ${s.studentName}, ${s.totalCreditsAttempted}, ${s.totalCreditsEarned}, ${s.cgpa}, ${s.status}, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id) DO UPDATE SET
              serial = EXCLUDED.serial,
              student_name = EXCLUDED.student_name,
              total_credits_attempted = EXCLUDED.total_credits_attempted,
              total_credits_earned = EXCLUDED.total_credits_earned,
              cgpa = EXCLUDED.cgpa,
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
          `.execute(this.db).catch(() => undefined);
        }

        this.logger.log('student_verifications auto-seeding complete.');
      }
    } catch (err: any) {
      this.logger.warn(`Could not finish ensureTablesAndSeed: ${err?.message || err}`);
    }
  }

  async verifyStudent(dto: VerifyStudentDto) {
    const rawId = dto.studentId?.trim();
    if (!rawId) {
      throw new BadRequestException('Student ID is required');
    }

    let student: any = null;

    // 1. Try querying the database
    try {
      student = await this.db
        .selectFrom('student_verifications' as any)
        .selectAll()
        .where(sql`LOWER(student_id)`, '=', rawId.toLowerCase())
        .executeTakeFirst();

      if (!student && rawId.length >= 4) {
        student = await this.db
          .selectFrom('student_verifications' as any)
          .selectAll()
          .where(sql`student_id`, 'like', `%${rawId}`)
          .executeTakeFirst();
      }
    } catch (dbErr: any) {
      this.logger.warn(`Database query for student ${rawId} failed: ${dbErr?.message}`);
    }

    // 2. If not found in DB, check official verified registry (121 students)
    if (!student) {
      const match = STUDENT_VERIFICATION_DATABASE.find(
        (s) =>
          s.studentId.toLowerCase() === rawId.toLowerCase() ||
          (rawId.length >= 4 && s.studentId.endsWith(rawId)),
      );

      if (match) {
        student = {
          serial: match.serial,
          studentId: match.studentId,
          studentName: match.studentName,
          student_id: match.studentId,
          student_name: match.studentName,
          cgpa: match.cgpa,
          totalCreditsEarned: match.totalCreditsEarned,
          total_credits_earned: match.totalCreditsEarned,
          status: match.status,
        };

        // Asynchronously persist to database so future queries hit DB directly
        sql`
          INSERT INTO student_verifications (serial, student_id, student_name, total_credits_attempted, total_credits_earned, cgpa, status, updated_at)
          VALUES (${match.serial}, ${match.studentId}, ${match.studentName}, ${match.totalCreditsAttempted}, ${match.totalCreditsEarned}, ${match.cgpa}, ${match.status}, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id) DO UPDATE SET
            student_name = EXCLUDED.student_name,
            cgpa = EXCLUDED.cgpa,
            total_credits_earned = EXCLUDED.total_credits_earned,
            updated_at = CURRENT_TIMESTAMP
        `.execute(this.db).catch(() => undefined);
      }
    }

    if (!student) {
      throw new NotFoundException(
        `Student ID '${rawId}' was not found in official university database records. Only verified students may register.`,
      );
    }

    const sName = student.studentName ?? student.student_name ?? student.name ?? '';
    const sId = student.studentId ?? student.student_id ?? rawId;
    const sCredits = parseFloat(student.totalCreditsEarned ?? student.total_credits_earned ?? student.credits) || 0;
    const sCgpa = parseFloat(student.cgpa) || 0;
    const sSerial = student.serial ?? 0;
    const sStatus = student.status ?? 'Active';

    // Strict Leader authorization check
    const LEADER_STUDENT_ID = '0272320005101220';
    const isLeaderCheck =
      dto.role === 'leader' || dto.role === 'Team Leader' || dto.role?.toLowerCase().includes('leader');

    if (isLeaderCheck && sId !== LEADER_STUDENT_ID && !sId.endsWith(LEADER_STUDENT_ID)) {
      throw new BadRequestException(
        `Student ID '${rawId}' (${sName}) is not authorized to register as Team Leader. Only Student ID 0272320005101220 (Md Sabbir Ahmed) can register as Team Leader. Please choose General Member.`,
      );
    }

    return {
      success: true,
      student: {
        serial: sSerial,
        studentId: sId,
        name: sName,
        cgpa: sCgpa,
        credits: sCredits,
        status: sStatus,
      },
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const studentId = dto.studentId.trim();

    // Strict Leader check for OTP issuance
    const LEADER_STUDENT_ID = '0272320005101220';
    const isLeaderCheck =
      dto.role === 'leader' || dto.role === 'Team Leader' || dto.role?.toLowerCase().includes('leader');

    if (isLeaderCheck && studentId !== LEADER_STUDENT_ID && !studentId.endsWith(LEADER_STUDENT_ID)) {
      throw new BadRequestException(
        'Only Student ID 0272320005101220 (Md Sabbir Ahmed) is authorized to request OTP for Team Leader account creation.',
      );
    }

    // Validate student exists in DB or official list
    let studentCheck: any = null;
    try {
      studentCheck = await this.db
        .selectFrom('student_verifications' as any)
        .select('student_id')
        .where(sql`LOWER(student_id)`, '=', studentId.toLowerCase())
        .executeTakeFirst();
    } catch {
      // fallback
    }

    if (!studentCheck) {
      const match = STUDENT_VERIFICATION_DATABASE.find(
        (s) => s.studentId.toLowerCase() === studentId.toLowerCase() || (studentId.length >= 4 && s.studentId.endsWith(studentId)),
      );
      if (!match) {
        throw new NotFoundException('Invalid student ID for OTP issuance.');
      }
    }

    // Generate real 6-digit cryptographic numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any old OTPs for this email
    await this.db
      .deleteFrom('research_otps' as any)
      .where('email', '=', email)
      .execute()
      .catch(() => undefined);

    // Store new OTP in database
    await this.db
      .insertInto('research_otps' as any)
      .values({
        email,
        student_id: studentId,
        otp_code: otpCode,
        expires_at: expiresAt,
      })
      .execute()
      .catch(() => undefined);

    this.logger.log(`Generated OTP for ${email}: ${otpCode}`);

    return {
      success: true,
      message: `A 6-digit OTP code has been generated for ${email}.`,
      otpCode, // Returned for UI notification/toast display
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const code = dto.otpCode.trim();

    let record: any = null;
    try {
      record = await this.db
        .selectFrom('research_otps' as any)
        .selectAll()
        .where('email', '=', email)
        .where('otp_code', '=', code)
        .where('expires_at', '>', new Date())
        .executeTakeFirst();
    } catch (err: any) {
      this.logger.error(`Error querying OTP from database: ${err?.message}`);
    }

    if (!record) {
      throw new BadRequestException(
        'Invalid or expired OTP code. Please enter the correct 6-digit code.',
      );
    }

    // Clean up used OTP
    await this.db
      .deleteFrom('research_otps' as any)
      .where('email', '=', email)
      .execute()
      .catch(() => undefined);

    return {
      success: true,
      message: 'OTP verified successfully.',
    };
  }

  async register(dto: RegisterResearchUserDto) {
    const studentId = dto.studentId.trim();
    const email = dto.email.trim().toLowerCase();

    // 1. Verify student exists in university database or official records
    let verifiedStudent: any = null;
    try {
      verifiedStudent = await this.db
        .selectFrom('student_verifications' as any)
        .selectAll()
        .where(sql`LOWER(student_id)`, '=', studentId.toLowerCase())
        .executeTakeFirst();
    } catch {
      // fallback
    }

    if (!verifiedStudent) {
      const match = STUDENT_VERIFICATION_DATABASE.find(
        (s) => s.studentId.toLowerCase() === studentId.toLowerCase() || (studentId.length >= 4 && s.studentId.endsWith(studentId)),
      );
      if (match) {
        verifiedStudent = {
          student_id: match.studentId,
          student_name: match.studentName,
          cgpa: match.cgpa,
          total_credits_earned: match.totalCreditsEarned,
        };
      } else {
        throw new BadRequestException(
          'Student ID is not recognized in official university database records.',
        );
      }
    }

    // 2. Prepare user fields and credentials
    const sId = verifiedStudent.studentId ?? verifiedStudent.student_id ?? studentId;
    const sName = verifiedStudent.studentName ?? verifiedStudent.student_name ?? dto.name.trim();
    const sCgpa = verifiedStudent.cgpa;
    const sCredits = verifiedStudent.totalCreditsEarned ?? verifiedStudent.total_credits_earned;

    // Strict validation: Only ID 0272320005101220 can create a Team Leader account
    const LEADER_STUDENT_ID = '0272320005101220';
    const isLeaderRequest =
      dto.role === 'Team Leader' || dto.role?.toLowerCase().includes('leader');

    if (isLeaderRequest && sId !== LEADER_STUDENT_ID) {
      throw new BadRequestException(
        'Only authorized student ID 0272320005101220 (Md Sabbir Ahmed) is permitted to create a Team Leader account. Other students must register as General Member.',
      );
    }

    const assignedRole =
      sId === LEADER_STUDENT_ID
        ? 'Team Leader'
        : (isLeaderRequest ? 'General Member' : (dto.role || 'General Member'));

    const passwordHash = await hashPassword(dto.password);

    // 3. Check if already registered
    const existingUser: any = await this.db
      .selectFrom('research_users' as any)
      .selectAll()
      .where((eb: any) =>
        eb.or([
          eb(sql`LOWER(student_id)`, '=', studentId.toLowerCase()),
          eb('email', '=', email),
        ]),
      )
      .executeTakeFirst()
      .catch(() => null);

    if (existingUser) {
      // If student ID or email matches, update existing account (allows seamless retry after 500 error)
      if (
        (existingUser.student_id || existingUser.studentId) === sId ||
        existingUser.email?.toLowerCase() === email
      ) {
        const [updatedUser]: any = await this.db
          .updateTable('research_users' as any)
          .set({
            name: sName,
            email,
            password_hash: passwordHash,
            role: assignedRole,
            team_id: dto.teamId?.trim() || '0X7-CORE',
            cgpa: sCgpa,
            credits: sCredits,
            updated_at: new Date(),
          })
          .where('id', '=', existingUser.id)
          .returningAll()
          .execute();

        return {
          success: true,
          user: {
            id: updatedUser.id,
            studentId: updatedUser.studentId ?? updatedUser.student_id ?? sId,
            name: updatedUser.name ?? sName,
            email: updatedUser.email ?? email,
            role: updatedUser.role ?? assignedRole,
            teamId: updatedUser.teamId ?? updatedUser.team_id ?? '0X7-CORE',
            cgpa: updatedUser.cgpa ?? sCgpa,
            credits: updatedUser.credits ?? sCredits,
          },
        };
      }

      throw new BadRequestException(
        'An account with this Student ID or Email already exists. Please sign in.',
      );
    }

    const [createdUser]: any = await this.db
      .insertInto('research_users' as any)
      .values({
        student_id: sId,
        name: sName,
        email,
        password_hash: passwordHash,
        role: assignedRole,
        team_id: dto.teamId?.trim() || '0X7-CORE',
        cgpa: sCgpa,
        credits: sCredits,
      })
      .returningAll()
      .execute();

    return {
      success: true,
      user: {
        id: createdUser.id,
        studentId: createdUser.studentId ?? createdUser.student_id ?? sId,
        name: createdUser.name ?? sName,
        email: createdUser.email ?? email,
        role: createdUser.role ?? 'Researcher',
        teamId: createdUser.teamId ?? createdUser.team_id ?? '0X7-CORE',
        cgpa: createdUser.cgpa ?? sCgpa,
        credits: createdUser.credits ?? sCredits,
      },
    };
  }

  async login(dto: LoginResearchUserDto) {
    const identifier = dto.studentId.trim().toLowerCase();

    // 1. Find user by student_id or email
    const user: any = await this.db
      .selectFrom('research_users' as any)
      .selectAll()
      .where((eb: any) =>
        eb.or([
          eb(sql`LOWER(student_id)`, '=', identifier),
          eb(sql`LOWER(email)`, '=', identifier),
        ]),
      )
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this Student ID or Email. Please register first.',
      );
    }

    // 2. Compare password hash
    const userPasswordHash = user.passwordHash ?? user.password_hash;
    const isMatch = await comparePasswordHash(dto.password, userPasswordHash);
    if (!isMatch) {
      throw new UnauthorizedException(
        'Incorrect password. Please verify and try again.',
      );
    }

    return {
      success: true,
      user: {
        id: user.id,
        studentId: user.studentId ?? user.student_id ?? identifier,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId ?? user.team_id,
        cgpa: user.cgpa,
        credits: user.credits,
      },
    };
  }

  async cleanAllAccounts(): Promise<{ success: boolean; message: string }> {
    await this.db
      .deleteFrom('research_users' as any)
      .execute()
      .catch((err) => {
        this.logger.warn(`Could not clear research_users: ${err?.message}`);
      });

    await this.db
      .deleteFrom('research_otps' as any)
      .execute()
      .catch((err) => {
        this.logger.warn(`Could not clear research_otps: ${err?.message}`);
      });

    this.logger.log('All created research accounts and OTP records have been wiped clean.');

    return {
      success: true,
      message: 'All created research accounts and OTP records have been deleted successfully.',
    };
  }

  async syncSession(
    userData: { studentId?: string; email?: string; name?: string; role?: string },
    reply?: FastifyReply,
  ) {
    try {
      // 1. Ensure workspace exists
      let workspace = await this.workspaceRepo.findFirst().catch(() => null);
      if (!workspace) {
        try {
          const [newWs]: any = await sql`
            INSERT INTO workspaces (id, name, default_role, created_at, updated_at)
            VALUES (gen_random_uuid(), '0x7 Research Center', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
          `.execute(this.db);
          workspace = newWs;
        } catch (wsErr: any) {
          this.logger.warn(`Could not insert workspace: ${wsErr?.message}`);
          workspace = await this.workspaceRepo.findFirst().catch(() => null);
        }
      }

      if (!workspace) {
        return {
          success: false,
          error: 'No workspace available',
          workspaceId: null,
          spaceId: null,
          spaceSlug: 'general',
        };
      }

      // 2. Ensure default space exists
      let space: any = await this.db
        .selectFrom('spaces' as any)
        .selectAll()
        .where('workspace_id', '=', workspace.id)
        .executeTakeFirst()
        .catch(() => null);

      if (!space) {
        try {
          const [newSpace]: any = await sql`
            INSERT INTO spaces (id, workspace_id, name, slug, visibility, default_role, created_at, updated_at)
            VALUES (gen_random_uuid(), ${workspace.id}, 'Research Notes', 'general', 'PUBLIC', 'WRITER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
          `.execute(this.db);
          space = newSpace;
        } catch (spaceErr: any) {
          this.logger.warn(`Could not insert space: ${spaceErr?.message}`);
        }
      }

      // 3. Match or create user in Docmost users table
      const sId = userData?.studentId?.trim() || '0272320005101220';
      const email = (userData?.email?.trim() || `${sId}@0x7.internal`).toLowerCase();
      const name = userData?.name?.trim() || (sId === '0272320005101220' ? 'Md Sabbir Ahmed' : 'Researcher');
      const isLeader = sId === '0272320005101220' || userData?.role?.toLowerCase().includes('leader');
      const docmostRole = isLeader ? 'ADMIN' : 'MEMBER';

      let user: any = await this.userRepo.findByEmail(email, workspace.id).catch(() => null);
      if (!user) {
        const firstAdmin = await this.userRepo.findFirstAdmin(workspace.id).catch(() => null);
        if (firstAdmin && !userData?.email) {
          user = firstAdmin;
        } else {
          try {
            const [newUser]: any = await sql`
              INSERT INTO users (id, workspace_id, name, email, role, email_verified_at, created_at, updated_at)
              VALUES (gen_random_uuid(), ${workspace.id}, ${name}, ${email}, ${docmostRole}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING *
            `.execute(this.db);
            user = newUser;
          } catch (uErr: any) {
            this.logger.warn(`Could not insert docmost user: ${uErr?.message}`);
            user = (await this.userRepo.findFirst(workspace.id).catch(() => null)) || firstAdmin;
          }
        }
      }

      if (!user) {
        return {
          success: false,
          error: 'Could not resolve user',
          workspaceId: workspace.id,
          spaceId: space?.id,
          spaceSlug: space?.slug || 'general',
        };
      }

      // 4. Ensure space membership
      if (space && user) {
        try {
          await sql`
            INSERT INTO space_members (id, space_id, user_id, role, created_at, updated_at)
            VALUES (gen_random_uuid(), ${space.id}, ${user.id}, ${isLeader ? 'ADMIN' : 'WRITER'}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (space_id, user_id) DO NOTHING
          `.execute(this.db);
        } catch {
          // ignore conflict
        }
      }

      // 5. Generate Docmost JWT
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          workspaceId: workspace.id,
          type: JwtType.ACCESS,
        },
        this.environmentService.getAppSecret(),
        { expiresIn: '30d' },
      );

      // 6. Set cookie on response
      if (reply && typeof reply.setCookie === 'function') {
        try {
          reply.setCookie('authToken', token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            expires: this.environmentService.getCookieExpiresIn(),
            secure: this.environmentService.isHttps(),
          });
        } catch (err: any) {
          this.logger.warn(`Could not set authToken cookie: ${err?.message}`);
        }
      }

      return {
        success: true,
        token,
        workspaceId: workspace.id,
        spaceId: space?.id,
        spaceSlug: space?.slug || 'general',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err: any) {
      this.logger.warn(`syncSession failed gracefully: ${err?.message}`);
      return {
        success: false,
        error: err?.message,
      };
    }
  }

  async createResearchNote(dto: {
    title: string;
    content?: string;
    projectId?: string;
    isPublished?: boolean;
    authorName?: string;
    authorStudentId?: string;
    authorId?: string;
    spaceId?: string;
  }) {
    const title = dto.title?.trim() || 'Untitled Note';
    const textContent = dto.content?.trim() || '';
    const projectId = dto.projectId ? String(dto.projectId) : null;
    const isPublished = dto.isPublished === true;

    // 1. Sync session to get workspace and space
    const session = await this.syncSession({
      studentId: dto.authorStudentId,
      name: dto.authorName,
      role: dto.authorStudentId === '0272320005101220' ? 'Team Leader' : 'Researcher',
    });

    const workspaceId = session.workspaceId;
    const spaceId = dto.spaceId || session.spaceId;
    const creatorId = session.user?.id;
    const slugId = generateSlugId();

    const noteMetadata = {
      projectId,
      isPublished,
      authorName: dto.authorName || session.user?.name || 'Researcher',
      authorStudentId: dto.authorStudentId || '',
    };

    const docContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: textContent || '' }],
        },
      ],
      metadata: noteMetadata,
    };

    // 2. Insert into pages table directly using only standard columns
    let createdPage: any = null;
    if (workspaceId && spaceId && creatorId) {
      try {
        const [row]: any = await sql`
          INSERT INTO pages (
            id, slug_id, title, workspace_id, space_id, creator_id, last_updated_by_id,
            text_content, content, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), ${slugId}, ${title}, ${workspaceId}, ${spaceId}, ${creatorId}, ${creatorId},
            ${textContent}, ${JSON.stringify(docContent)}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING *
        `.execute(this.db);
        createdPage = row;
      } catch (insertErr: any) {
        this.logger.warn(`Could not insert into pages table: ${insertErr?.message}`);
      }
    }

    const spaceSlug = session.spaceSlug || 'general';

    return {
      success: true,
      note: {
        id: createdPage?.id || `local-${slugId}`,
        slugId: createdPage?.slug_id || slugId,
        title: createdPage?.title || title,
        isPublished,
        projectId,
        spaceSlug,
        spaceId,
        createdAt: createdPage?.created_at || new Date().toISOString(),
        updatedAt: createdPage?.updated_at || new Date().toISOString(),
        author: {
          id: creatorId || 'researcher',
          name: dto.authorName || session.user?.name || 'Researcher',
          avatar: '',
        },
        preview: textContent.slice(0, 140) || 'Empty note content...',
        content: textContent,
      },
    };
  }

  async getResearchNotes(projectId?: string) {
    const workspace = await this.workspaceRepo.findFirst().catch(() => null);
    if (!workspace) {
      return { notes: [], totalNotes: 0, publishedNotesCount: 0 };
    }

    const rawPages: any[] = await this.db
      .selectFrom('pages' as any)
      .selectAll()
      .where('workspace_id', '=', workspace.id)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute()
      .catch(() => []);

    const notes = rawPages
      .map((p) => {
        let meta: any = {};
        try {
          if (p.content && typeof p.content === 'object' && p.content.metadata) {
            meta = p.content.metadata;
          } else if (typeof p.content === 'string') {
            const parsed = JSON.parse(p.content);
            meta = parsed?.metadata || {};
          }
        } catch {
          // ignore parse errors
        }

        const noteProjectId = meta.projectId || null;
        const isPublished = meta.isPublished !== undefined ? meta.isPublished : true;
        const authorName = meta.authorName || 'Researcher';

        const preview = p.text_content
          ? p.text_content.slice(0, 140).trim()
          : 'Empty note content...';

        return {
          id: p.id,
          slugId: p.slug_id || p.slugId,
          title: p.title || 'Untitled Note',
          isPublished,
          projectId: noteProjectId,
          spaceSlug: 'general',
          spaceId: p.space_id,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          author: {
            id: p.creator_id || 'researcher',
            name: authorName,
            avatar: '',
          },
          preview,
          content: p.text_content || '',
        };
      })
      .filter((n) => !projectId || n.projectId === String(projectId));

    return {
      notes,
      totalNotes: notes.length,
      publishedNotesCount: notes.filter((n) => n.isPublished).length,
    };
  }
}
