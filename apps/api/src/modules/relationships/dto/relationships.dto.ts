import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  relationshipClaimDecisions,
  relationshipKinds,
  relationshipVisibilities,
  supplyChainRoles,
  type RelationshipClaimDecision,
  type RelationshipKind,
  type RelationshipVisibility,
} from '@telpen/domain';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateRelationshipClaimDto {
  @ApiProperty({ example: 'Nairobi Fresh Produce Cooperative' })
  @IsString()
  @Length(2, 160)
  declare sourceLabel: string;

  @ApiProperty({ enum: supplyChainRoles, example: 'SUPPLIER' })
  @IsIn(supplyChainRoles)
  declare sourceRole: (typeof supplyChainRoles)[number];

  @ApiProperty({ example: 'Rift Valley Cold Chain Logistics' })
  @IsString()
  @Length(2, 160)
  declare counterpartLabel: string;

  @ApiProperty({ enum: supplyChainRoles, example: 'LOGISTICS_PROVIDER' })
  @IsIn(supplyChainRoles)
  declare counterpartRole: (typeof supplyChainRoles)[number];

  @ApiPropertyOptional({ example: '22222222-2222-4222-8222-222222222222' })
  @IsOptional()
  @IsString()
  @Length(36, 36)
  declare counterpartTenantId?: string;

  @ApiProperty({ enum: relationshipKinds, example: 'SHIPS' })
  @IsIn(relationshipKinds)
  declare relationship: RelationshipKind;

  @ApiProperty({ enum: relationshipVisibilities, example: 'PUBLIC' })
  @IsIn(relationshipVisibilities)
  declare visibility: RelationshipVisibility;

  @ApiPropertyOptional({ example: 'Weekly cold-chain delivery for hotel produce.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare note?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class DecideRelationshipClaimDto {
  @ApiProperty({ enum: relationshipClaimDecisions, example: 'APPROVED' })
  @IsIn(relationshipClaimDecisions)
  declare decision: RelationshipClaimDecision;

  @ApiPropertyOptional({ example: 'Confirmed weekly produce deliveries.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare decisionNote?: string;
}

export class RemoveRelationshipClaimDto {
  @ApiProperty({ example: 'Impersonation of the logistics partner.' })
  @IsString()
  @Length(4, 500)
  declare reason: string;
}
