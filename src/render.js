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


// Get the path to the directory containing the app
const appPath = app.getAppPath();

// Get the parent directory of the app directory
const parentDirectory = path.dirname(appPath);

// Construct the path to the ffmpeg executable
const ffmpegPath = path.join(parentDirectory, '..', 'bin', 'ffmpeg.exe');

console.log('FFmpeg Path:', ffmpegPath, "load successfully.");

// Check if the ffmpeg executable exists
fs.access(ffmpegPath, fs.constants.F_OK)
    .then(() => {
        // If the file exists, set the FFmpeg path
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg.setFfmpegPath(ffmpegPath);


    })
    .catch((err) => {
        // If the file does not exist or is not accessible, display an error message
        console.error('FFmpeg file does not exist or is not accessible:', err);
    });
// Variables for UI elements
let menuTimeout;
let mediaRecorder;
const recordedChunks = [];


// Function to remove inline styles from an element
function removeInlineStyles(element) {
  element.removeAttribute('style');
}

// Event listener for start recording button
startBtn.onclick = e => {
  if (mediaRecorder.state !== 'recording') {

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
};

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

  // Show save dialog for the recorded video
  const { filePath } = await dialog.showSaveDialog({
      buttonLabel: 'Save video',
      defaultPath: `vid-${Date.now()}`
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
      
      try {
        // Convert WebM to MP4
        await convertWebMToMP4(filePath);
        console.log('WEBM to MP4 successfully');

        // Delete WebM file
        fs.unlink(filePath);
        console.log('Delete  WebM file');
      } catch (error) {
        console.error('Error converting file:', error);
      }
    });
  } catch (error) {
      console.error('Error saving file:', error);
  }
  // Clear recorded chunks
  recordedChunks.length = 0;
  
}

// Function to convert WebM to MP4
function convertWebMToMP4(filePath) {
  return new Promise((resolve, reject) => {
      console.log(filePath)
      ffmpeg(filePath)
          .outputOptions('-c:v', 'libx264')
          .outputOptions('-preset', 'medium')
          .outputOptions('-crf', '23')
          .outputOptions('-c:a', 'aac')
          .outputOptions('-strict', 'experimental')
          .output(`${filePath}.mp4`)
          .on('end', () => {
              resolve();
             
          })
          .on('error', (err) => {
              reject(err);
          })
          .run();
  });
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
