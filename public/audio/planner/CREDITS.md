# Planner voice clips

Spoken by the preset voice **M5** of [Supertonic 3](https://huggingface.co/Supertone/supertonic-3)
(Supertone; code MIT, model under the BigScience OpenRAIL-M licence, which allows commercial
use and claims no rights in the output). The voice is AI-generated, and the guide says so.

`manifest.json` lists, per language, each clip id with a fingerprint of the words it was
made from (`lineHash` in `src/planner/voiceScript.ts`). When the planner's copy changes,
the clip for that line stops playing and the device's synthesiser reads the new words until
the line is recorded again.
