/* Niivue Plugin for Bluelight */

var NiivuePlugin = {};
NiivuePlugin.nv = null;

function loadNiivuePlugin() {
    // Load Niivue Library
    if (typeof niivue === 'undefined') {
        var script = document.createElement('script');
        script.src = "../scripts/external/niivue.js";
        script.type = 'text/javascript';
        document.head.appendChild(script);
    }

    // Create 3D drawer if not exists
    if (!document.getElementById("3DImgParent")) {
        var span = document.createElement("SPAN");
        span.id = "3DImgParent";
        span.innerHTML = `
         <img class="img" loading="lazy" altzhtw="3D" alt="3D" id="3dDrawerImg" src="../image/icon/lite/3D.png"
              width="50" height="50">
        <div id="3DImgeDIv" class="drawer" style="position:absolute;left: 0;white-space:nowrap;z-index: 100;
        width: 500; display: none;background-color: black;"></div>`;
        addIconSpan(span);

        document.getElementById("3dDrawerImg").onclick = function () {
            if (this.enable == false) return;
            hideAllDrawer("3DImgeDIv");
            invertDisplayById('3DImgeDIv');
            if (document.getElementById("3DImgeDIv").style.display == "none") document.getElementById("3DImgParent").style.position = "";
            else {
                document.getElementById("3DImgParent").style.position = "relative";
            }
        }
    }

    // Add Niivue Icon
    var span = document.createElement("SPAN");
    span.innerHTML = `<img class="innerimg" alt="Niivue" id="ImgNiivue" onmouseover="onElementOver(this);" onmouseleave="onElementLeave();" src="../image/icon/lite/b_CineTools.png" width="50" height="50">`;
    if (document.getElementById("3DImgeDIv")) {
        document.getElementById("3DImgeDIv").appendChild(span);
    }

    // Create Niivue Page
    var page = document.createElement("div");
    page.id = "NiivuePage";
    page.className = "page";
    page.style.display = "none";
    page.style.height = "100%";
    page.style.backgroundColor = "black";
    page.innerHTML = `<div style="width: 100%; height: 100%;"><canvas id="niivue-canvas" style="width: 100%; height: 100%; display: block;"></canvas></div>`;

    // Add close button
    var closeBtn = document.createElement("img");
    closeBtn.src = "../image/icon/lite/exit.png";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "10px";
    closeBtn.style.right = "10px";
    closeBtn.style.width = "50px";
    closeBtn.style.height = "50px";
    closeBtn.style.zIndex = "100";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = function () {
        NiivuePlugin.exit();
    };
    page.appendChild(closeBtn);
    document.getElementById("pages").appendChild(page);

    document.getElementById("ImgNiivue").onclick = function () {
        NiivuePlugin.enter();
    }
}

NiivuePlugin.enter = function () {
    hideAllDrawer();
    Pages.displayPage("NiivuePage");

    if (typeof niivue === 'undefined') {
        alert("Niivue library still loading, please try again in a moment.");
        return;
    }

    if (!NiivuePlugin.nv) {
        NiivuePlugin.nv = new niivue.Niivue();
        NiivuePlugin.nv.attachTo('niivue-canvas');
        NiivuePlugin.nv.setSliceType(niivue.SLICE_TYPE.MULTIPLANAR);
        NiivuePlugin.nv.setClipPlane([-0.1, 270, 0]);
        NiivuePlugin.nv.setRenderVersion(niivue.RENDER_VERSION.WEBGL2);
    }

    NiivuePlugin.loadCurrentSeries();
}

NiivuePlugin.exit = function () {
    try {
        Pages.displayPage("DicomPage");
    } catch (ex) {
        // Fallback if Pages isn't globally available or fails
        document.getElementById("NiivuePage").style.display = "none";
        document.getElementById("DicomPage").style.display = "block";
    }
}

NiivuePlugin.loadCurrentSeries = function () {
    var viewport = GetViewport();
    if (!viewport || !viewport.series) {
        // Try to get first series if viewport is empty
        console.warn("No series in viewport.");
        return;
    }

    var seriesUID = viewport.series;
    var seriesObj = ImageManager.findSeries(seriesUID);
    if (!seriesObj || !seriesObj.Sop) return;

    var sopList = seriesObj.Sop;
    // Sort by instance number
    sopList.sort((a, b) => parseInt(a.InstanceNumber) - parseInt(b.InstanceNumber));

    var urls = [];
    for (var i = 0; i < sopList.length; i++) {
        var sop = sopList[i];
        if (sop.Image.url) {
            urls.push(sop.Image.url);
        } else if (typeof getWadoUriURL === 'function' && typeof ConfigLog !== 'undefined' && ConfigLog.WADO) {
            var studyUID = sop.Image.StudyInstanceUID || sop.dataSet.string(Tag.StudyInstanceUID);
            var seriesUID = sop.Image.SeriesInstanceUID || sop.dataSet.string(Tag.SeriesInstanceUID);
            var objectUID = sop.Image.SOPInstanceUID || sop.dataSet.string(Tag.SOPInstanceUID);
            var wadoUrl = getWadoUriURL(studyUID, seriesUID, objectUID);
            if (wadoUrl) urls.push(wadoUrl);
        }
    }

    if (urls.length > 0) {
        var volumeList = [{
            url: urls,
        }];
        NiivuePlugin.nv.loadVolumes(volumeList);
    } else {
        console.warn("No URLs found for Niivue.");
    }
}

NiivuePlugin.loadNifti = function (url) {
    NiivuePlugin.enter();
    if (NiivuePlugin.nv) {
        var volumeList = [{
            url: url,
        }];
        NiivuePlugin.nv.loadVolumes(volumeList);
    } else {
        // Retry if not initialized yet? enter() initializes it but async loading of script might delay?
        // enter() checks if niivue is defined.
        setTimeout(function () {
            if (NiivuePlugin.nv) {
                var volumeList = [{
                    url: url,
                }];
                NiivuePlugin.nv.loadVolumes(volumeList);
            }
        }, 500);
    }
}

loadNiivuePlugin();
