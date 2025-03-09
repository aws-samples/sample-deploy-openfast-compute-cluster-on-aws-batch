#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ec2_alpha from "@aws-cdk/aws-ec2-alpha";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from "constructs";


interface BatchStackProps extends cdk.StackProps {
    vpc: ec2_alpha.VpcV2, 
    projectName: string,
    suffix: string,
    maxvCpus: number,
    sg: ec2.SecurityGroup
}


export class BatchStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BatchStackProps) {
        super(scope, id, props);

        var projName: string = `${props.projectName}-${props.suffix}`; 

        const computeEnvRole = new iam.Role(this, `compute-env-role-${props.suffix}`, {
            assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
            roleName: `__${projName}-compute-env-role`
        });
        computeEnvRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"));
        computeEnvRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"));
        computeEnvRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(
            this, 
            "compute-env-role-AmazonEC2ContainerServiceforEC2Role",
            "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
        ));

        const jobDefinitionRole = new iam.Role(this, `job-definition-role-${props.suffix}`, {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            roleName: `__${projName}-job-definition-role`,
        });
        jobDefinitionRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(
            this, 
            "job-definition-role-AmazonEC2ContainerServiceforEC2Role",
            "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
        ));
        jobDefinitionRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [
                    `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/batch/job:*`,
                    `arn:aws:logs:${this.region}:${this.account}:log-group:/${projName}/*:*`
                ],
                actions: [
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                    "logs:CreateLogGroup"
                ]
            })
        );

        const computeEnv = new batch.ManagedEc2EcsComputeEnvironment(this, `compute-env-${props.suffix}`, {
            computeEnvironmentName: `compute-env-${projName}`,
            vpc: props.vpc,
            // instanceClasses: [ec2.InstanceClass.R4],
            spot: false,
            minvCpus: 0,
            maxvCpus: props.maxvCpus,
            allocationStrategy: batch.AllocationStrategy.BEST_FIT_PROGRESSIVE,
            instanceRole: computeEnvRole,
            securityGroups: [props.sg]
        });

        const queue = new batch.JobQueue(this, `job-queue-${props.suffix}`, {
            jobQueueName: `job-queue-${projName}`,
            computeEnvironments: [{
                computeEnvironment: computeEnv,
                order: 1,
            }],
            priority: 1,
        });

        const logGroupTurbsim = new logs.LogGroup(this, `lg-turbsim-${props.suffix}`, {
            logGroupName: `/${projName}/turbsim`,
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const logGroupOpenFAST = new logs.LogGroup(this, `lg-openfast-${props.suffix}`, {
            logGroupName: `/${projName}/openfast`,
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const jobTurbsim = new batch.EcsJobDefinition(this, `job-definition-turbsim-${props.suffix}`, {
            jobDefinitionName: `turbsim-job-${projName}`,
            timeout: cdk.Duration.seconds(5000),
            retryAttempts: 1,
            container: new batch.EcsEc2ContainerDefinition(this, `container-definition-turbsim-${props.suffix}`, {
                image: ecs.ContainerImage.fromRegistry(`${this.account}.dkr.ecr.${this.region}.amazonaws.com/turbsim-${props.suffix}:latest`),
                memory: cdk.Size.mebibytes(2048),
                cpu: 1,
                executionRole: jobDefinitionRole,
                logging: ecs.LogDrivers.awsLogs({
                    streamPrefix: 'turbsim',
                    logGroup: logGroupTurbsim,
                    mode: ecs.AwsLogDriverMode.NON_BLOCKING,
                }),
            })
        });

        const jobOpenFAST = new batch.EcsJobDefinition(this, `job-definition-openfast-${props.suffix}`, {
            jobDefinitionName: `openfast-job-${projName}`,
            timeout: cdk.Duration.seconds(5000),
            retryAttempts: 1,
            container: new batch.EcsEc2ContainerDefinition(this, `container-definition-openfast-${props.suffix}`, {
                image: ecs.ContainerImage.fromRegistry(`${this.account}.dkr.ecr.${this.region}.amazonaws.com/openfast-${props.suffix}:latest`),
                memory: cdk.Size.mebibytes(4096),
                cpu: 1,
                executionRole: jobDefinitionRole,
                logging: ecs.LogDrivers.awsLogs({
                    streamPrefix: 'openfast',
                    logGroup: logGroupOpenFAST,
                    mode: ecs.AwsLogDriverMode.NON_BLOCKING,
                }),
            })
        });

        new cdk.CfnOutput(this, `job-definition-openfast-output-${props.suffix}`, {
            exportName: "OPENFAST-JOB-DEFINITION",
            value: jobOpenFAST.jobDefinitionName
        });

        new cdk.CfnOutput(this, `job-definition-turbsim-output-${props.suffix}`, {
            exportName: "TURBSIM-JOB-DEFINITION",
            value: jobTurbsim.jobDefinitionName
        });

        new cdk.CfnOutput(this, `job-queue-output-${props.suffix}`, {
            exportName: "JOB-QUEUE",
            value: queue.jobQueueName
        });
    }
}