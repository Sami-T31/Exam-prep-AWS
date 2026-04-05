import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UserListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
