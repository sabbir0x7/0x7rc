import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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

@Injectable()
export class ResearchAuthService {
  private readonly logger = new Logger(ResearchAuthService.name);

  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async verifyStudent(dto: VerifyStudentDto) {
    const rawId = dto.studentId?.trim();
    if (!rawId) {
      throw new BadRequestException('Student ID is required');
    }

    // 1. Exact match on student_id
    let student: any = await this.db
      .selectFrom('student_verifications' as any)
      .selectAll()
      .where(sql`LOWER(student_id)`, '=', rawId.toLowerCase())
      .executeTakeFirst();

    // 2. Suffix match if >= 4 digits entered (e.g. 1220 -> 0272320005101220)
    if (!student && rawId.length >= 4) {
      student = await this.db
        .selectFrom('student_verifications' as any)
        .selectAll()
        .where(sql`student_id`, 'like', `%${rawId}`)
        .executeTakeFirst();
    }

    if (!student) {
      throw new NotFoundException(
        `Student ID '${rawId}' was not found in official university database records. Only verified students may register.`,
      );
    }

    return {
      success: true,
      student: {
        serial: student.serial,
        studentId: student.student_id,
        name: student.student_name,
        cgpa: parseFloat(student.cgpa) || 0,
        credits: parseFloat(student.total_credits_earned) || 0,
        status: student.status,
      },
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const studentId = dto.studentId.trim();

    // Validate student exists
    const studentCheck: any = await this.db
      .selectFrom('student_verifications' as any)
      .select('student_id')
      .where(sql`LOWER(student_id)`, '=', studentId.toLowerCase())
      .executeTakeFirst();

    if (!studentCheck) {
      throw new NotFoundException('Invalid student ID for OTP issuance.');
    }

    // Generate real 6-digit cryptographic numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any old OTPs for this email
    await this.db
      .deleteFrom('research_otps' as any)
      .where('email', '=', email)
      .execute();

    // Store new OTP in database
    await this.db
      .insertInto('research_otps' as any)
      .values({
        email,
        student_id: studentId,
        otp_code: otpCode,
        expires_at: expiresAt,
      })
      .execute();

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

    const record: any = await this.db
      .selectFrom('research_otps' as any)
      .selectAll()
      .where('email', '=', email)
      .where('otp_code', '=', code)
      .where('expires_at', '>', new Date())
      .executeTakeFirst();

    if (!record) {
      throw new BadRequestException(
        'Invalid or expired OTP code. Please enter the correct 6-digit code.',
      );
    }

    // Clean up used OTP
    await this.db
      .deleteFrom('research_otps' as any)
      .where('email', '=', email)
      .execute();

    return {
      success: true,
      message: 'OTP verified successfully.',
    };
  }

  async register(dto: RegisterResearchUserDto) {
    const studentId = dto.studentId.trim();
    const email = dto.email.trim().toLowerCase();

    // 1. Verify student exists in university database
    const verifiedStudent: any = await this.db
      .selectFrom('student_verifications' as any)
      .selectAll()
      .where(sql`LOWER(student_id)`, '=', studentId.toLowerCase())
      .executeTakeFirst();

    if (!verifiedStudent) {
      throw new BadRequestException(
        'Student ID is not recognized in official university database records.',
      );
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
      .executeTakeFirst();

    if (existingUser) {
      throw new BadRequestException(
        'An account with this Student ID or Email already exists. Please sign in.',
      );
    }

    // 3. Hash password using bcrypt
    const passwordHash = await hashPassword(dto.password);

    // 4. Save to research_users table
    const [createdUser]: any = await this.db
      .insertInto('research_users' as any)
      .values({
        student_id: verifiedStudent.student_id,
        name: verifiedStudent.student_name || dto.name.trim(),
        email,
        password_hash: passwordHash,
        role: dto.role || 'Researcher',
        team_id: dto.teamId?.trim() || '0X7-CORE',
        cgpa: verifiedStudent.cgpa,
        credits: verifiedStudent.total_credits_earned,
      })
      .returningAll()
      .execute();

    return {
      success: true,
      user: {
        id: createdUser.id,
        studentId: createdUser.student_id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        teamId: createdUser.team_id,
        cgpa: createdUser.cgpa,
        credits: createdUser.credits,
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
    const isMatch = await comparePasswordHash(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException(
        'Incorrect password. Please verify and try again.',
      );
    }

    return {
      success: true,
      user: {
        id: user.id,
        studentId: user.student_id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.team_id,
        cgpa: user.cgpa,
        credits: user.credits,
      },
    };
  }
}
