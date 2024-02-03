
let debugMode = true;

// Initialize WOW.js
new WOW().init();

// File system modules
const { writeFile} = require('fs');
const { promises: fs } = require("fs");
const path = require("path");

// Remote module for Electron
const remote = require('@electron/remote');
const { dialog, Menu } = remote;

// Electron modules
const { ipcRenderer } = require('electron');

// Desktop Capturer module
const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
};

const ffmpeg = require('fluent-ffmpeg');

// Get the path to the directory containing the app
const appPath = remote.app.getAppPath();

// Get the parent directory of the app directory
const parentDirectory = path.dirname(appPath);

// Construct the path to the ffmpeg executable
const local_ffmpegPath  = path.join(parentDirectory, '..', 'bin', 'ffmpeg.exe');
const debug_ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const ffmpegPath = debugMode ? debug_ffmpegPath : local_ffmpegPath;

// Check if the ffmpeg executable exists
fs.access(ffmpegPath, fs.constants.F_OK)
    .then(() => {
        // If the file exists, set the FFmpeg path
        ffmpeg.setFfmpegPath(ffmpegPath);
    })
    .catch((err) => {
        // If the file does not exist or is not accessible, display an error message
        console.error('FFmpeg file does not exist or is not accessible:', err);
    })
    .finally(() => {
        console.log('FFmpeg Path:', ffmpegPath, "loaded successfully.");
        
    });

// Variables for UI elements
let menuTimeout;
let mediaRecorder;
let startTime;
let elapsedTimeInSeconds = 0;

const recordedChunks = [];


// Function to remove inline styles from an element
function removeInlineStyles(element) {
  element.removeAttribute('style');
}



// Event listener for start recording button
startBtn.onclick = e => {
  if (mediaRecorder.state !== 'recording') {
    startTime = new Date();
    mediaRecorder.start();
    startBtn.classList.add('is-danger');
    startBtn.innerHTML = '<i class="fa-solid fa-circle fa-beat-fade fa-xs" style="color: #d5203b;"></i> Recording ... ';
  } else{
    console.log('MediaRecorder is already recording.');
  }
};

// Event listener for stop recording button
stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerHTML = '<i class="fas fa-play"></i> Start Recording';
  elapsedTimeInSeconds = Math.floor((new Date() - startTime) / 1000);

  if (elapsedTimeInSeconds < 1) {
      alert("Recording time is too short!");
  };
}

// Event listener for selecting video sources
videoSelectBtn.onclick = getVideoSources;

// Function to get video sources
async function getVideoSources() {

  try {

    const inputSources = await desktopCapturer.getSources({
      types: ['window', 'screen']
    });
    
    // Create menu for selecting video sources
    const videoOptionsMenu = Menu.buildFromTemplate(
      inputSources.map(source => {
        return {
          label: source.name,
          click: () => selectSource(source)
        };

      })

    );

    videoOptionsMenu.popup();

  } catch (error) {
    console.error('Error fetching video sources:', error);
  }
}


// Function to select video source
async function selectSource(source) {

  // Remove inline styles
  removeInlineStyles(Video)
  removeInlineStyles(videoPlayer)
  removeInlineStyles(videoContainer)
  
  // Update UI with selected source
  videoSourseBtn.removeAttribute('hidden');
  videoSourseBtn.innerText = source.name;


  // Scroll to video player
  if (videoPlayer) {
    videoPlayer.scrollIntoView({ behavior: 'smooth' });
  }

  // Set constraints for media stream
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        facingMode: "user",
        
      }
    }
  };

  // Get media stream
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  // Set media stream to video element
  Video.srcObject = stream;
  Video.play();
  Video.removeAttribute('hidden');

  // Configure media recorder
  const options = { mimeType: 'video/webm; codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);

  // Event listeners for media recorder
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  

}

// Function to handle data available event
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Function to handle stop event
async function handleStop(e) {
  // Create blob from recorded chunks
  const blob = new Blob(recordedChunks, {
      type: 'video/webm;codecs=vp9'
  });

 
  if(elapsedTimeInSeconds > 1) {
    // Show save dialog for the recorded video
    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save video',
        defaultPath: `vid-${Date.now()}.webm`
    });
  
    // If no file path selected, return
    if (!filePath) {
        return;
    }
  
    try {
        // Convert blob to buffer
        const buffer = Buffer.from(await blob.arrayBuffer());
        
        // Write buffer to file
        writeFile(filePath, buffer, async (err) => {
        if (err) {
          console.error('Error saving file:', err);
          return;
        }
        
        // try {
        //   // Convert WebM to MP4
        //   await convertWebMToMP4(filePath);
        //   console.log('WEBM to MP4 successfully');
  
        //   // Delete WebM file
        //   fs.unlink(filePath);
        //   console.log('Delete  WebM file');
        // } catch (error) {
        //   console.error('Error converting file:', error);
        // }
  
      });
  
    } catch (error) {
        console.error('Error saving file:', error);
    }
    // Clear recorded chunks
    recordedChunks.length = 0;
    
    // `filePath` parameter is the file path of the video
    // `elapsedTimeInSeconds` is the elapsed time in seconds
    await convertWebMToMP4(filePath, elapsedTimeInSeconds);
  }
  
}
const mainWindow = remote.getCurrentWindow();

// Function to convert WebM to MP4
async function convertWebMToMP4(inputFilePath,elapsedTimeInSeconds) {
  // Replace the input WebM video file path with the corresponding MP4 video file path
  const outputFilePath = inputFilePath.replace('.webm', '.mp4'); 
  console.log(outputFilePath)
  document.getElementById('programBox').classList.remove('hidden');

  // Use FFmpeg to process the input WebM video
  var command = ffmpeg(inputFilePath)
    .outputOptions('-c:v', 'libx264')
    .outputOptions('-preset', 'ultrafast')
    .outputOptions('-crf', '23')
    .outputOptions('-c:a', 'aac')
    .outputOptions('-strict', 'experimental')
    .on('progress', function(progress) {

      programCancelBtn.onclick = function() {
        command.kill();
        document.getElementById('programBox').classList.add('hidden');
        console.log('Processing killed!');
      };

      const timemark = parseInt(progress.timemark.replace(/:/g, ''))
      if (!isNaN(timemark) && timemark > 0 && timemark <= elapsedTimeInSeconds) {
        const percent = (timemark / elapsedTimeInSeconds) * 100;
        const progressMessage = 'Processing: ' + (percent >= 99.5 ? '100' : percent.toFixed(2)) + '%';
        
        document.querySelector('#programBox p').textContent = progressMessage;
        
      }
      else{
        document.querySelector('#programBox p').textContent = "Processing: 0 %"
      }

      
 
    })
    .on('start', function() {
      document.querySelector('#programBox p').textContent = "Processing: 0 %"
    })
    .on('end', function() {
      console.log('Processing finished !');
      document.querySelector('#programBox p').textContent = "Processing: 100 %"
      document.getElementById('programBox').classList.add('hidden');


    })
    .on('error', function(err) {
      document.querySelector('#programBox p').textContent = "Processing: 0 %"
      console.log('An error occurred: ' + err.message);
    })
    .save(outputFilePath);
}




const body = document.querySelector('body'),
    sidebar = body.querySelector('nav'),
    toggle = body.querySelector(".toggle"),
    searchBtn = body.querySelector(".search-box"),
    modeSwitch = body.querySelector(".toggle-switch"),
    modeText = body.querySelector(".mode-text");
    menu = body.querySelector('.menu-bar');
    


// Event listeners for menu interactions - mouseenter
menu.addEventListener('mouseenter', () => {
    clearTimeout(menuTimeout); 
    menuTimeout = setTimeout(() => {
        sidebar.classList.remove('close');
    }, 1200);
   
});

// Event listeners for menu interactions - mouseleave
menu.addEventListener('mouseleave', () => {
    clearTimeout(menuTimeout);
    menuTimeout = setTimeout(() => {
        sidebar.classList.add('close');
    }, 500);
});

// Event listener for toggle button
toggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
})

// Event listener for search button
searchBtn.addEventListener("click", () => {
    sidebar.classList.remove("close");
})


// Event listener for mode switch
modeSwitch.addEventListener("click", () => {
    body.classList.toggle("dark");

    // Update mode text
    if (body.classList.contains("dark")) {
        modeText.innerText = "Light mode";
    } else {
        modeText.innerText = "Dark mode";

    }
});

// Event listener for page load
document.addEventListener("DOMContentLoaded", function () {
  var videoSelectBtn = document.getElementById("videoSelectBtn");
  var appName = document.getElementById("appName");
  appName.style.display = "block";
  videoSelectBtn.style.display = "block";
  var hiddenDiv = document.getElementById("boardline");
  hiddenDiv.style.display = "block";
});

// Scroll to home section on home button click
var homeBtn = document.querySelector('.nav-link a[href="#home"]');
var homeSection = document.getElementById('home');

homeBtn.addEventListener('click', function (event) {
  event.preventDefault();
  homeSection.scrollIntoView({ behavior: 'smooth' });
});
