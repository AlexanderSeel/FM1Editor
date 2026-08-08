FROM python:3.7.7-slim-buster
ENV NUMBA_DISABLE_JIT=1
ENV PYTHONPATH=/opt/stubs
RUN python -m pip install --no-cache-dir --disable-pip-version-check \
  numpy==1.18.5 scipy==1.4.1 llvmlite==0.31.0 numba==0.48.0 joblib==0.14.1 \
  scikit-learn==0.22.2.post1 audioread==2.1.8 librosa==0.7.2
COPY stubs /opt/stubs
COPY generate.py /opt/generate.py
ENTRYPOINT ["python","/opt/generate.py"]
