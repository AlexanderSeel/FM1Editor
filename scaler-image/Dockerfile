FROM python:3.11-slim
RUN python -m pip install --no-cache-dir --disable-pip-version-check numpy==1.26.4 joblib==1.4.2
COPY spiegelib /opt/modules/spiegelib
COPY extract.py /opt/extract.py
ENV PYTHONPATH=/opt/modules
ENTRYPOINT ["python", "/opt/extract.py"]
