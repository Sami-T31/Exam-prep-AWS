import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConsentDto {
  @IsOptional()
  @IsBoolean()
  analyticsOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  personalizationOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptTermsNow?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptPrivacyNow?: boolean;
}
