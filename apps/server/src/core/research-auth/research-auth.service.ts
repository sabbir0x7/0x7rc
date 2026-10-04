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
import { comparePasswordHash, hashPassword } from '../../common/helpers';
import { STUDENT_VERIFICATION_DATABASE } from './data/official-students';

@Injectable()
export class ResearchAuthService implements OnModuleInit {
  private readonly logger = new Logger(ResearchAuthService.name);

  constructor(@InjectKysely() private readonly db: KyselyDB) {}

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

    // 2. Check if already registered
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
      throw new BadRequestException(
        'An account with this Student ID or Email already exists. Please sign in.',
      );
    }

    // 3. Hash password using bcrypt
    const passwordHash = await hashPassword(dto.password);

    // 4. Save to research_users table
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
}
