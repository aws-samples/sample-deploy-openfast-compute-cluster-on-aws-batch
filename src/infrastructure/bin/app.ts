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
const openfastMemory = env.openfastMemory
const turbsimMemory = env.turbsimMemory

console.log('Project name          👉 ', project)
console.log('Project uuid          👉 ', uuid)
console.log('VPC CIDR              👉 ', cidr)
console.log('Subnet A CIDR         👉 ', cidrSubnetA)
console.log('Subnet B CIDR         👉 ', cidrSubnetB)
console.log('Maximum CPUs          👉 ', maxvCpus)
console.log('S3 asset expire       👉 ', s3BucketAssetExpiration)
console.log('S3 log expire         👉 ', s3BucketLogExpiration)
console.log('OpenFAST memory (MiB) 👉 ', openfastMemory)
console.log('TurbSim memory (MiB)  👉 ', turbsimMemory)


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
    sg: vpcStack.sg,
    openfastMemory: openfastMemory,
    turbsimMemory: turbsimMemory
});