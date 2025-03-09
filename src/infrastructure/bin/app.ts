#!/usr/bin/env node
import { AwsSolutionsChecks } from "cdk-nag";
import { BucketStack } from "../lib/buckets";
import { VpcStack } from "../lib/vpc";
import { BatchStack } from "../lib/batch";
import { EcrStack } from "../lib/containers";
import * as cdk from "aws-cdk-lib";

const desc = "Guidance for ... on aws ()"

const app = new cdk.App();

const stackEnv = app.node.tryGetContext("env")
const env = app.node.tryGetContext(stackEnv)
const project = env.project
const uuid = env.uuid
const cidr = env.cidr
const cidrSubnetA = env.cidrSubnetA
const cidrSubnetB = env.cidrSubnetB
const maxvCpus = env.maxvCpus
const s3BucketAssetExpiration = env.s3BucketAssetExpiration
const s3BucketLogExpiration = env.s3BucketLogExpiration

console.log('Project name    👉 ', env.project)
console.log('Project uuid    👉 ', env.uuid)
console.log('VPC CIDR        👉 ', env.cidr)
console.log('Subnet A CIDR   👉 ', env.cidrSubnetA)
console.log('Subnet B CIDR   👉 ', env.cidrSubnetB)
console.log('Maximum CPUs    👉 ', env.maxvCpus)
console.log('S3 asset expire 👉 ', env.s3BucketAssetExpiration)
console.log('S3 log expire   👉 ', env.s3BucketLogExpiration)


if (env.uuid == null) {
    console.log()
    console.log('🛑 Stack failed. You need to define the uuid for the ' + stackEnv + ' environment.')
    console.log('🛑 Open the cdk.json file and replace null with a unique identifier.')
    process.exit(1)
}

const ecrStack = new EcrStack(app, "ecr-stack", {
    projectName: project,
    suffix: uuid
});

const bucketStack = new BucketStack(app, "bucket-stack", {
    projectName: project,
    suffix: uuid,
    s3BucketAssetExpiration: s3BucketAssetExpiration,
    s3BucketLogExpiration: s3BucketLogExpiration
});

const vpcStack = new VpcStack(app, "vpc-stack", {
    projectName: project,
    suffix: uuid,
    cidr: cidr,
    cidrSubnetA: cidrSubnetA,
    cidrSubnetB: cidrSubnetB
});

const batchStack = new BatchStack(app, "batch-stack", {
    projectName: project,
    suffix: uuid, 
    vpc: vpcStack.vpc,
    maxvCpus: maxvCpus,
    sg: vpcStack.sg
});