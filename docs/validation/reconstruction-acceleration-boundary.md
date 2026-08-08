# Optional reconstruction acceleration boundary

Source commit: `bdc5921f71c115bfe4c7ac55697759a0dac91726`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| focused-test | 0 |
| full-test | 0 |
| build | 0 |

The accepted client remains local-only when `VITE_RECONSTRUCTION_ACCELERATOR_URL` is absent. Capability discovery uploads no audio. A remote request requires HTTPS/localhost, complete service/model/license metadata, bounded automatic deletion, a one-shot consent tied to the exact reference SHA-256 and policy identity, and a valid deletion receipt. Returned candidates must decode as legal 155-byte DX7 voice data before they can be loaded.

This acceptance validates the browser/client safety boundary and local fallback. It does not claim that a production accelerator service exists or that a learned model has been admitted.
