# To run turbsim container locally: 
# 
#     $ docker run -e S3_BUCKET='<sw3-bucket-name>' \
#         -e AWS_PROFILE='<profile>' \
#         -e AWS_BATCH_JOB_ARRAY_INDEX='99' \
#         -e IEC_TURB='B' -e IEC_WIND_TYPE='NTM' -it turbsim

FROM --platform=linux/amd64 public.ecr.aws/amazonlinux/amazonlinux:2023 AS build

SHELL ["/bin/bash", "-c"]
COPY ./TurbSim /build/turbsim
RUN yum -y update
ENV TZ=America/Denver
RUN ln -snf /dev/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN yum groupinstall -y "Development Tools"
RUN yum install -y lapack-devel blas-devel
RUN cd /build/turbsim/compiling/ && make

# -----------------
# multi-stage build
FROM --platform=linux/amd64 public.ecr.aws/amazonlinux/amazonlinux:2023

SHELL ["/bin/bash", "-c"]
COPY --from=build /build/turbsim/bin /app/
COPY ./input /input
COPY prep.py prep.py
RUN yum -y update
ENV TZ=America/Denver
RUN ln -snf /dev/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN yum install -y lapack-devel blas-devel awscli
RUN echo $'#!/bin/bash\n\
dnf install python3.11 -y\n\
python3.11 -m venv .env\n\
source .env/bin/activate\n\
pip install boto3 watchtower' >> /setup.sh
RUN chmod 0744 /setup.sh
RUN /setup.sh

RUN echo $'#!/bin/bash\n\
source /.env/bin/activate\n\
CURRENT_FILE=`python prep.py --turbsim --index=$AWS_BATCH_JOB_ARRAY_INDEX --type=$IEC_WIND_TYPE --intensity=$IEC_TURB`\n\
/app/TurbSim_glin64 $CURRENT_FILE\n\
STATUS=$?\n\
if [[ "$STATUS" == "0" ]]; then\n\
    rm -rf input \n\
    for i in *.{inp,bts,sum}; do aws s3 cp ${i} $S3_BUCKET/turbsim/$IEC_WIND_TYPE/$IEC_TURB/${i}; done\n\
    exit 0\n\
else\n\
    rm -rf input \n\
    echo "[ERROR] TurbSim failed: job $AWS_BATCH_JOB_ARRAY_INDEX"\n\
    echo "TurbSim failed input file is saved to $S3_BUCKET/turbsim/$IEC_WIND_TYPE/$IEC_TURB/_failed"\n\
    for i in *.{inp,sum}; do aws s3 cp ${i} $S3_BUCKET/turbsim/$IEC_WIND_TYPE/$IEC_TURB/_failed/${i}; done\n\
    exit 1\n\
fi' >> /entry.sh
RUN chmod 0744 /entry.sh
RUN cat /entry.sh
ENTRYPOINT ["/entry.sh"]