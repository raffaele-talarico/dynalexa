let index = function index(event, context, callback) {
  console.log("started aws lambda");

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Create EC2 service object
var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

var s3 = new AWS.S3({apiVersion: '2006-03-01'});

// Variable to hold the ID of a VPC
var vpc = null;

//variable to hold SecurityGroup name
var groupname = 'Dynalexa_SG';



// Retrieve the ID of a VPC
ec2.describeVpcs(function(err, data) {
   if (err) {
      console.log("Cannot retrieve a VPC", err);   
   } else {
      vpc = data.Vpcs[0].VpcId;   
   }
});

// Create JSON object parameters for creating the security group
var paramsSG = {
   Description: 'this is the Dynalexa SG',
   GroupName: groupname,
   VpcId: vpc
};

// Create the security group
ec2.createSecurityGroup(paramsSG, function(err, data) {
   if (err) {
      console.log("Error Creating Security Group", err);
   } else {
      var SecurityGroupId = data.GroupId;
      console.log("Security Group Created", SecurityGroupId);
      var paramsIngress = {
        GroupName: groupname,
        IpPermissions:[
           { IpProtocol: "tcp",
             FromPort: 443,
             ToPort: 443,
             IpRanges: [{"CidrIp":"0.0.0.0/0"}]},
           { IpProtocol: "tcp",
             FromPort: 8443,
             ToPort: 8443,
             IpRanges: [{"CidrIp":"0.0.0.0/0"}]},
          { IpProtocol: "tcp",
             FromPort: 22,
             ToPort: 22,
             IpRanges: [{"CidrIp":"0.0.0.0/0"}]}
        ]
      };
      ec2.authorizeSecurityGroupIngress(paramsIngress, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Ingress Successfully Set", data);
        }
     });
   }
});

//the user data script for the newly created EC2 instance 
var dynatrace = `#!/bin/bash
DYNATRACEDOWNLOADURL= "your download URL here"
LICENSEKEY="yourlicense key"
INITENV="My5MinutesEnvironment"
INITNAME="Your"
INITLASTNAME="Name"
INITEMAIL="your@email.com"
INITPWD="youradminpassword"

wget -O /tmp/dynatrace-managed.sh $DYNATRACEDOWNLOADURL
cd /tmp/
/bin/sh dynatrace-managed.sh --install-silent --license $LICENSEKEY --initial-environment $INITENV --initial-first-name $INITNAME --initial-last-name $INITLASTNAME --initial-email $INITEMAIL --initial-pass $INITPWD`;

//params for EC2 istance creation - modify here the instance Type and the keyName
var paramsEC2 = {
   ImageId: 'ami-28c90151', // amzn-ami-2011.09.1.x86_64-ebs
   InstanceType: 't1.micro',
   KeyName: 'YourAWSKeyNameHere',
   MinCount: 1,
   MaxCount: 1,
   SecurityGroups: [groupname],
   UserData: dynatrace
};

// Create the instance
ec2.runInstances(paramsEC2, function(err, data) {
   if (err) {
      console.log("Could not create instance", err);
      return;
   }
   var instanceId = data.Instances[0].InstanceId;
   console.log("Created instance", instanceId);
   // Add tags to the instance
   params = {Resources: [instanceId], Tags: [
      {
         Key: 'Name',
         Value: 'Dynalexa'
      }
   ]};
   ec2.createTags(params, function(err) {
      console.log("Tagging instance", err ? "failure" : "success");
   });
});

  console.log("job done");
}

exports.handler = index;   
