FROM python:3.7.7-slim-buster
COPY dexed_simple_fm.json /opt/dexed_simple_fm.json
COPY check.py /opt/check.py
ENTRYPOINT ["python", "/opt/check.py"]
