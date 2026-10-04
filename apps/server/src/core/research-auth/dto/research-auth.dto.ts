import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyStudentDto {
  @IsNotEmpty({ message: 'Student ID is required' })
  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class SendOtpDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @IsNotEmpty({ message: 'Student ID is required' })
  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: '6-digit OTP code is required' })
  @IsString()
  @MinLength(6, { message: 'OTP code must be 6 digits' })
  otpCode: string;
}

export class RegisterResearchUserDto {
  @IsNotEmpty({ message: 'Student ID is required' })
  @IsString()
  studentId: string;

  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsString()
  role: string;

  @IsNotEmpty({ message: 'Team ID is required' })
  @IsString()
  teamId: string;
}

export class LoginResearchUserDto {
  @IsNotEmpty({ message: 'Student ID or email is required' })
  @IsString()
  studentId: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}
