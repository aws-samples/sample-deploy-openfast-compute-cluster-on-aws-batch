#!/bin/bash
S3_ASSET_BUCKET_NAME=s3://`aws cloudformation describe-stacks --stack-name bucket-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "S3-ASSET-BUCKET-NAME", "value": ."S3-ASSET-BUCKET-NAME"}] | from_entries | ."S3-ASSET-BUCKET-NAME"'`
S3_LOG_BUCKET_NAME=s3://`aws cloudformation describe-stacks --stack-name bucket-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "S3-LOG-BUCKET-NAME", "value": ."S3-LOG-BUCKET-NAME"}] | from_entries | ."S3-LOG-BUCKET-NAME"'`
TURBSIM_REGISTRY=`aws cloudformation describe-stacks --stack-name ecr-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "TURBSIM-REGISTRY", "value": ."TURBSIM-REGISTRY"}] | from_entries | ."TURBSIM-REGISTRY"'` ;
OPENFAST_REGISTRY=`aws cloudformation describe-stacks --stack-name ecr-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "OPENFAST-REGISTRY", "value": ."OPENFAST-REGISTRY"}] | from_entries | ."OPENFAST-REGISTRY"'` ;
OPENFAST_JOB_DEFINITION=`aws cloudformation describe-stacks --stack-name batch-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "OPENFAST-JOB-DEFINITION", "value": ."OPENFAST-JOB-DEFINITION"}] | from_entries | ."OPENFAST-JOB-DEFINITION"'` ;
TURBSIM_JOB_DEFINITION=`aws cloudformation describe-stacks --stack-name batch-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "TURBSIM-JOB-DEFINITION", "value": ."TURBSIM-JOB-DEFINITION"}] | from_entries | ."TURBSIM-JOB-DEFINITION"'` ;
JOB_QUEUE=`aws cloudformation describe-stacks --stack-name batch-stack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "JOB-QUEUE", "value": ."JOB-QUEUE"}] | from_entries | ."JOB-QUEUE"'` 

echo "S3_ASSET_BUCKET_NAME = $S3_ASSET_BUCKET_NAME"
echo "S3_LOG_BUCKET_NAME = $S3_LOG_BUCKET_NAME"
echo "TURBSIM_REGISTRY = $TURBSIM_REGISTRY"
echo "OPENFAST_REGISTRY = $OPENFAST_REGISTRY"
echo "OPENFAST_JOB_DEFINITION = $OPENFAST_JOB_DEFINITION"
echo "TURBSIM_JOB_DEFINITION = $TURBSIM_JOB_DEFINITION"
echo "JOB_QUEUE = $JOB_QUEUE"