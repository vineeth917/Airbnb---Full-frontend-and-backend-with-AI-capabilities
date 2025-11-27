#!/bin/bash

# Script to get VPC ID and Subnet ID for CloudFormation deployment

echo "=== Listing VPCs ==="
echo ""
echo "All VPCs:"
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock,IsDefault,Tags[?Key==`Name`].Value|[0]]' --output table

echo ""
echo "=== Default VPC ==="
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
if [ "$DEFAULT_VPC" != "None" ] && [ -n "$DEFAULT_VPC" ]; then
    echo "Default VPC ID: $DEFAULT_VPC"
    echo ""
    echo "Subnets in default VPC:"
    aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC" --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table
else
    echo "No default VPC found"
fi

echo ""
echo "=== All Subnets ==="
aws ec2 describe-subnets --query 'Subnets[*].[SubnetId,VpcId,AvailabilityZone,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table

echo ""
echo "=== Quick Commands ==="
echo ""
echo "Get default VPC ID:"
echo "  aws ec2 describe-vpcs --filters \"Name=isDefault,Values=true\" --query 'Vpcs[0].VpcId' --output text"
echo ""
echo "Get all VPC IDs:"
echo "  aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output text"
echo ""
echo "Get subnet IDs for a specific VPC (replace vpc-xxxxxxxxx):"
echo "  aws ec2 describe-subnets --filters \"Name=vpc-id,Values=vpc-xxxxxxxxx\" --query 'Subnets[*].SubnetId' --output text"
echo ""
echo "Get subnet IDs in default VPC:"
echo "  DEFAULT_VPC=\$(aws ec2 describe-vpcs --filters \"Name=isDefault,Values=true\" --query 'Vpcs[0].VpcId' --output text)"
echo "  aws ec2 describe-subnets --filters \"Name=vpc-id,Values=\$DEFAULT_VPC\" --query 'Subnets[*].SubnetId' --output text"
echo ""
echo "Get public subnets (with internet gateway route):"
echo "  aws ec2 describe-subnets --filters \"Name=vpc-id,Values=vpc-xxxxxxxxx\" --query 'Subnets[?MapPublicIpOnLaunch==\`true\`].[SubnetId,AvailabilityZone]' --output table"

