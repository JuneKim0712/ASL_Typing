import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let handLandmarker;
let runningMode = "VIDEO";
const alphabet = 'abcdefghiklmnopqrstuvwxy';
let model;
let sess;

const loadModel = async() => {
    sess = new onnx.InferenceSession();
    model = await sess.loadModel('hand_keypoints_model.onnx');
};

const predictAlphabet = async (landmarks) => {
    if (landmarks != undefined) {

      const flattenedLandmarks = landmarks.flatMap(landmark => [landmark.x, landmark.y, landmark.z]);
      console.log(flattenedLandmarks)
        const tensor = new onnx.Tensor(new Float32Array(flattenedLandmarks), "float32");
        console.log(tensor);

  const results = await sess.run(tensor);
  console.log(results)
  //const outputTensor = results.values().next().value;
  //const probabilities = outputTensor.data;

  //const maxIndex = probabilities.indexOf(Math.max(...probabilities));
  //const predictedAlphabet = alphabet[maxIndex];
  
  //console.log(`Predicted alphabet: ${predictedAlphabet}, Probability: ${probabilities[maxIndex]}`);
    }

};

const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
  await loadModel();
  startWebcam();
};

createHandLandmarker();

const startWebcam = () => {
  const video = document.getElementById("webcam");

  const constraints = { video: true };
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
};

const predictWebcam = () => {
  const video = document.getElementById("webcam");
  const processFrame = async () => {
    if (handLandmarker) {
      const results = await handLandmarker.detectForVideo(video, performance.now());
      if (results.landmarks) {
        await predictAlphabet(results.landmarks[0]);
      }
      requestAnimationFrame(processFrame);
    }
  };
  processFrame();
};
