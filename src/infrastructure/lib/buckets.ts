#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3_deploy from "aws-cdk-lib/aws-s3-deployment";

import { join } from "path";
import { Construct } from "constructs";


interface BucketStackProps extends cdk.StackProps {
    projectName: string,
    suffix: string,
    s3BucketAssetExpiration: number,
    s3BucketLogExpiration: number
}


export class BucketStack extends cdk.Stack {

    public readonly assetBucketArn: string;
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: BucketStackProps) {
        super(scope, id, props);

        var projName: string = `${props.projectName}-${props.suffix}`; 

        const accessLogsBucket = new s3.Bucket(this, `bucket-logs-${props.suffix}`, {
            bucketName: `asset-logs-${projName}`,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            lifecycleRules: [{
                expiration: cdk.Duration.days(props.s3BucketAssetExpiration)
            }]
        })

        const assetBucket = new s3.Bucket(this, `bucket-assets-${props.suffix}`, {
            bucketName: `asset-${projName}`,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                serverAccessLogsBucket: accessLogsBucket,
                serverAccessLogsPrefix: "logs",
                enforceSSL: true,
                lifecycleRules: [{
                    expiration: cdk.Duration.days(props.s3BucketLogExpiration)
                }]
        });

        const deployment = new s3_deploy.BucketDeployment(this, `templates-${props.suffix}`, {
            sources: [s3_deploy.Source.asset(join(__dirname, "..", "..", "..", "pkg", "turbsim", "input"))],
            destinationBucket: assetBucket,
            destinationKeyPrefix: "turbsim"
        });

        this.assetBucketArn = assetBucket.bucketArn;
        this.bucket = assetBucket;

        new cdk.CfnOutput(this, `bucket-assets-output-${props.suffix}`, {
            exportName: "S3-ASSET-BUCKET-NAME",
            value: assetBucket.bucketName
        });

        new cdk.CfnOutput(this, `bucket-logs-output-${props.suffix}`, {
            exportName: "S3-LOG-BUCKET-NAME",
            value: accessLogsBucket.bucketName
        });

        new cdk.CfnOutput(this, `stack-account-output-${props.suffix}`, {
            exportName: "stack-account",
            value: this.account
        });

        new cdk.CfnOutput(this, `stack-region-output-${props.suffix}`, {
            exportName: "stack-region",
            value: this.region
        });
    }
}