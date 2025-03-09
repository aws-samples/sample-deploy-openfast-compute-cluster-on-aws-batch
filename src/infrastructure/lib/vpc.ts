#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ec2_alpha from "@aws-cdk/aws-ec2-alpha";
import { Construct } from "constructs";


interface VpcStackProps extends cdk.StackProps {
    projectName: string,
    suffix: string
    cidr: string
    cidrSubnetA: string,
    cidrSubnetB: string
}


export class VpcStack extends cdk.Stack {

    public readonly vpc: ec2_alpha.VpcV2;
    public readonly sg: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: VpcStackProps) {
        super(scope, id, props);

        var projName: string = `${props.projectName}-${props.suffix}`; 

        const vpc = new ec2_alpha.VpcV2(this, `vpc-${props.suffix}`,{
            primaryAddressBlock: ec2_alpha.IpAddresses.ipv4(props.cidr),
            vpcName: `vpc-${projName}`,
        });

        const privateRT = new ec2_alpha.RouteTable(this, `rt-private-${props.suffix}`, {
            vpc: vpc,
            routeTableName: `rtb-private-${projName}`
        });
        
        new ec2_alpha.SubnetV2(this, `subnet-private-a-${props.suffix}`, {
            vpc: vpc,
            availabilityZone: `${this.region}a`,
            ipv4CidrBlock: new ec2_alpha.IpCidr(props.cidrSubnetA),
            subnetName: `private-subnet-2a-${projName}`,
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            routeTable: privateRT
        })

        new ec2_alpha.SubnetV2(this, `subnet-private-b-${props.suffix}`, {
            vpc: vpc,
            availabilityZone: `${this.region}b`,
            ipv4CidrBlock: new ec2_alpha.IpCidr(props.cidrSubnetB),
            subnetName: `private-subnet-2b-${projName}`,
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            routeTable: privateRT
        })

        const securityGroup = new ec2.SecurityGroup(this, `sg-${props.suffix}`, { 
            vpc: vpc,
            securityGroupName: `sec-grp-${projName}`,
        });

        securityGroup.addIngressRule(
            securityGroup,
            ec2.Port.tcpRange(0,65535),
            "self referencing rule",
        )

        const s3VpcEndpoint = vpc.addGatewayEndpoint(`s3-endpoint-${props.suffix}`, {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED
            }]
        });

        var services: string[] = ["ecr.dkr", "ecr.api", "secretsmanager", "ecs-agent", "ecs", "ecs-telemetry", "logs", "batch"]; 
        for (const service of services) {
            const newName = service.replace(".", "-"); 
            new ec2.InterfaceVpcEndpoint(this, `vpce-${newName}-${props.suffix}`, {
                vpc: vpc,
                service: new ec2.InterfaceVpcEndpointService(`com.amazonaws.${this.region}.${service}`, 443),
                privateDnsEnabled: true,
                securityGroups: [securityGroup],
                subnets: {
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    availabilityZones: [`${this.region}a`, `${this.region}b`],  
                }
            });
        }

        this.vpc = vpc
        this.sg = securityGroup
    }
}