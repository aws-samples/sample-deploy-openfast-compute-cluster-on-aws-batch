# To run openfast container locally: 
# 
#   $ docker run -v /full/file/path/pkg/openfast/prep_openfast.py:/prep_openfast.py \
#       -e CASE_ID='iteration-2' \
#       -e AWS_BATCH_JOB_ARRAY_INDEX='200' \
#       -e S3_BUCKET='<sw3-bucket-name>' \
#       -e EXCHANGE_SHEET='./exchange-sheets/exchange-sheet-DLC12-NTM.json' \
#       -e IEC_TURB='B' -e AWS_PROFILE='<profile>' -it openfast

FROM --platform=linux/amd64 public.ecr.aws/amazonlinux/amazonlinux:2023 AS build

SHELL ["/bin/bash", "-c"]
COPY ./openfast /usr/openfast
ENV TZ=America/Denver
RUN ln -snf /dev/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN yum -y update
RUN yum groupinstall -y "Development Tools"
RUN yum install -y lapack-devel blas-devel cmake3

# install controller
RUN cd /usr/openfast/reg_tests/r-test/glue-codes/openfast/5MW_Baseline/ServoData/DISCON/ && \
    mkdir build && \
    cd build && \
    cmake3 .. && \
    make && \
    make install && \ 
    mkdir -p /usr/openfast/install/bin/ && \
    mv DISCON.dll /usr/openfast/install/bin/

# install openfast
RUN cd /usr/openfast && \
    mkdir build && \
    cd build && \
    cmake3 .. && \
    make -j4 && \
    make install

# multi-stage build
FROM --platform=linux/amd64 public.ecr.aws/amazonlinux/amazonlinux:2023

SHELL ["/bin/bash", "-c"]
COPY --from=build /usr/openfast/install /app/   
# RUN mv /usr/openfast/install /app/   
COPY ./input /input
COPY ./exchange-sheets /exchange-sheets
COPY prep_openfast.py prep_openfast.py
RUN yum -y update
ENV TZ=America/Denver
RUN ln -snf /dev/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN yum install -y lapack-devel blas-devel awscli
RUN echo $'#!/bin/bash\n\
dnf install python3.11 -y\n\
python3.11 -m venv .env\n\
source .env/bin/activate' >> /setup.sh
RUN chmod 0744 /setup.sh
RUN /setup.sh

RUN echo $'#!/bin/bash\n\
source .env/bin/activate\n\
DLC=`python prep_openfast.py --get-dlc --file $EXCHANGE_SHEET`\n\
IEC_WIND_TYPE=`python prep_openfast.py --get-turbulence-type --file $EXCHANGE_SHEET`\n\
FAST_FILE=`python prep_openfast.py --create-fst --file $EXCHANGE_SHEET --index $AWS_BATCH_JOB_ARRAY_INDEX --ti $IEC_TURB --wc "$WIND_CLASS"`\n\
TURBSIM_FILE=`python prep_openfast.py --get-turbsim-path --file ./input/_5mw-inflowwind.dat`\n\
WS=`python prep_openfast.py --get-wind-speed --file ./input/_5mw-inflowwind.dat`\n\
cd input\n\
aws s3 cp $S3_BUCKET/turbsim/$WIND_CLASS$IEC_WIND_TYPE/$IEC_TURB/$TURBSIM_FILE .\n\
/app/bin/openfast $FAST_FILE\n\
STATUS=$?\n\
if [[ "$STATUS" == "0" ]]; then\n\
    for i in *.{fst,out,outb}; do aws s3 cp ${i} $S3_BUCKET/simulation/$CASE_ID/dlc=$DLC-$WIND_CLASS$IEC_WIND_TYPE/ws=$WS/${i}; done\n\
    exit 0\n\
else\n\
    echo "[ERROR] OpenFAST failed: job $AWS_BATCH_JOB_ARRAY_INDEX <$FAST_FILE>"\n\
    for i in *.{fst,ech,sum,out,outb}; do aws s3 cp ${i} $S3_BUCKET/simulation/$CASE_ID/dlc=$DLC$IEC_WIND_TYPE/_failed/ws=$WS/job-index=$AWS_BATCH_JOB_ARRAY_INDEX/${i}; done\n\
    aws s3 cp _5mw-elastodyn.dat $S3_BUCKET/simulation/$CASE_ID/dlc=$DLC-$WIND_CLASS$IEC_WIND_TYPE/_failed/ws=$WS/job-index=$AWS_BATCH_JOB_ARRAY_INDEX/_5mw-elastodyn.dat\n\
    aws s3 cp _5mw-elastodyn.dat $S3_BUCKET/simulation/$CASE_ID/dlc=$DLC-$WIND_CLASS$IEC_WIND_TYPE/_failed/ws=$WS/job-index=$AWS_BATCH_JOB_ARRAY_INDEX/_5mw-inflowwind.dat\n\
    exit 1\n\
fi' >> /entry.sh
RUN chmod 0744 /entry.sh
RUN cat /entry.sh
ENTRYPOINT ["/entry.sh"]