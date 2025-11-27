# AWS Deployment Guide - Simple Steps

This guide will help you deploy the Airbnb application to AWS. Think of it like moving your app from your computer to Amazon's computers.

## What You Need Before Starting

1. **AWS Account** - You need an Amazon Web Services account
2. **AWS CLI installed** - A tool to talk to AWS from your computer
3. **Docker installed** - To build your app
4. **AWS credentials configured** - So AWS knows it's you

## The 3 Simple Steps

### Step 1: Create Your Server (EC2 Instance)

This creates a computer in the cloud where your app will run.

**What to do:**
1. Navigate to the aws directory:
   ```bash
   cd aws
   ```

2. Find your VPC and Subnet IDs:
   ```bash
   ./get-vpc-subnet-ids.sh
   ```
   Copy the VPC ID and Subnet ID that appear.

3. Create a key pair:
    ```bash
    aws ec2 create-key-pair --key-name your-key-pair-name --query 'KeyMaterial' --output text > your-key-pair-name.pem
    ```

4. Create the server:
   ```bash
   aws cloudformation create-stack \
     --stack-name airbnb-lab2-ec2 \
     --template-body file://cloudformation-ec2-docker.yaml \
     --parameters \
       ParameterKey=KeyPairName,ParameterValue=your-key-pair-name \
       ParameterKey=VpcId,ParameterValue=vpc-xxxxxxxxx \
       ParameterKey=SubnetId,ParameterValue=subnet-xxxxxxxxx \
     --capabilities CAPABILITY_NAMED_IAM
   ```
   Replace `vpc-xxxxxxxxx` and `subnet-xxxxxxxxx` with your actual IDs.

4. Wait 2-3 minutes for the server to be ready. Check status:
   ```bash
   aws cloudformation describe-stacks --stack-name airbnb-lab2-ec2
   ```

5. Get your server's address (IP):
   ```bash
   aws ec2 describe-instances --filters "Name=tag:Name,Values=production-ec2-docker-1" --query 'Reservations[0].Instances[0].PublicIp' --output text
   ```

**What happened:** You now have 3 computers (servers) ready in AWS with Docker installed.

---

### Step 2: Build and Push Your App Images

This packages your app into containers and stores them in AWS's container storage (ECR).

**What to do:**
```bash
cd aws
./build-and-push-ecr.sh
```

---

### Step 3: Run Your App on the Server

This downloads your app containers and starts them running on your server.

**What to do:**

1. Connect to your server:
   ```bash
   ssh ec2-user@<your-server-ip>
   ```
   Replace `<your-server-ip>` with the IP from Step 1.

2. Once connected, create a folder and copy files:
   ```bash
   mkdir -p ~/airbnb-deploy
   cd ~/airbnb-deploy
   ```

3. Copy the docker-compose file to your server (from your local computer, in a new terminal):
   ```bash
   scp aws/docker-compose.yml ec2-user@<your-server-ip>:~/airbnb-deploy/
   ```

4. Back on the server, create a settings file:
   ```bash
   # Get your AWS account number
   AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   AWS_REGION=us-east-1
   
   # Create the settings file
   cat > .env << EOF
   AWS_ACCOUNT_ID=538594437382
   AWS_REGION=us-east-1
   ECR_PREFIX=airbnb-lab2
   VERSION_TAG=latest
   DB_HOST=mysql
   DB_USER=root
   DB_PASS=
   DB_NAME=airbnb_lab
   MONGO_URL=mongodb://mongodb:27017/airbnb_lab
   MYSQL_HOST=mysql
   MYSQL_USER=root
   MYSQL_PASSWORD=
   MYSQL_DB=airbnb_lab
   KAFKA_BROKERS=kafka:9092
   NODE_ENV=production
   EOF
   ```

5. Log in to AWS container storage:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
   ```

6. Start your app:
   ```bash
   docker compose -f docker-compose.yml --env-file .env up -d
   ```

7. Check if everything is running:
   ```bash
   docker compose ps
   ```

**What happened:** Your app is now running! You can access it at:
- Frontend: `http://<your-server-ip>`
- Backend API: `http://<your-server-ip>:4000`
- AI Service: `http://<your-server-ip>:8000`

---

## Quick Reference Commands

### Check if your app is running:
```bash
docker compose ps
```

### View app logs:
```bash
docker compose logs -f
```

### Stop your app:
```bash
docker compose down
```

### Restart your app:
```bash
docker compose restart
```

### Update your app (after pushing new images):
```bash
docker compose pull
docker compose up -d
```

---

## Troubleshooting

**Problem:** Can't connect to server
- **Solution:** Check your security group allows SSH (port 22) from your IP

**Problem:** Can't pull images from ECR
- **Solution:** Make sure you ran the login command in Step 3, part 5

**Problem:** App won't start
- **Solution:** Check logs: `docker compose logs`

**Problem:** Can't access app in browser
- **Solution:** Check security group allows ports 80, 4000, and 8000 from anywhere (0.0.0.0/0)

---

## What Each Step Does (Simple Explanation)

1. **Step 1 (CloudFormation):** Creates empty computers in AWS
2. **Step 2 (Build & Push):** Packages your app and stores it in AWS
3. **Step 3 (Docker Compose):** Downloads your app and runs it on the computers

Think of it like:
- Step 1: Buying empty houses
- Step 2: Packing your furniture and putting it in storage
- Step 3: Moving your furniture into the houses and setting everything up

---

## Need Help?

- Check AWS CloudFormation console to see if servers were created
- Check ECR console to see if images were pushed
- Use `docker logs <container-name>` to see what's happening inside containers
