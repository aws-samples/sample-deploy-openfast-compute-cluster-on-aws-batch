#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";


interface EcrStackProps extends cdk.StackProps {
    projectName: string,
    suffix: string
}


export class EcrStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: EcrStackProps) {
        super(scope, id, props);

        const ecrTurbsim = new ecr.Repository(this, `ecr-turbsim-${props.suffix}`, {
            repositoryName: `turbsim-${props.suffix}`,
            imageScanOnPush: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        const ecrOpenFAST = new ecr.Repository(this, `ecr-openfast-${props.suffix}`, {
            repositoryName: `openfast-${props.suffix}`,
            imageScanOnPush: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        new cdk.CfnOutput(this, `ecr-turbsim-output-${props.suffix}`, {
            exportName: "TURBSIM-REGISTRY",
            value: ecrTurbsim.repositoryName
        });

        new cdk.CfnOutput(this, `ecr-openfast-output-${props.suffix}`, {
            exportName: "OPENFAST-REGISTRY",
            value: ecrOpenFAST.repositoryName
        });
        
    }
}