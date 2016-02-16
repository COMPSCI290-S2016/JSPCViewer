
function SimplePCCanvas(glcanvas, shadersRelPath) {
    glcanvas.gl = null;
    glcanvas.lastX = 0;
    glcanvas.lastY = 0;
    glcanvas.dragging = false;
    glcanvas.justClicked = false;
    glcanvas.camera = new MousePolarCamera(glcanvas.width, glcanvas.height, 0.75);
    glcanvas.clickType = "LEFT";
    
    glcanvas.farDist = 1.0;
    
    
    glcanvas.reRenderPointCloud = function(drawPCA) {
        glcanvas.drawer.reset();
        for (var i = 0; i < glcanvas.points.length; i++) {
            glcanvas.drawer.drawPoint(glcanvas.points[i], glcanvas.colors[i]);
        }
        if (drawPCA) {
            var res = doPCA(glcanvas.points);
            var mean = res.mean;
            var E = res.E;
            var lam = res.lambda;
            colors = [[0.0, 0.0, 1.0], [0.0, 0.5, 0.0], [0.0, 0.5, 0.5]];
            for (var k = 0; k < 3; k++) {
                glcanvas.drawer.drawLine(mean, [mean[0]+lam[k]*E[0][k], mean[1]+lam[k]*E[1][k], mean[2]+lam[k]*E[2][k]], colors[k]);
            }
        }    
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.loadPointCloud = function(points, colors, drawPCA) {
        glcanvas.points = points;
        glcanvas.colors = colors;
        //Center camera
        var P0 = glcanvas.points[0]
        var bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        for (var i = 0; i < glcanvas.points.length; i++) {
            bbox.addPoint(glcanvas.points[i]);
        }
        glcanvas.camera.centerOnBBox(bbox);
        glcanvas.farDist = glcanvas.camera.R;
        glcanvas.reRenderPointCloud(drawPCA);
    }
    
    /////////////////////////////////////////////////////
    //Step 1: Setup repaint function
    /////////////////////////////////////////////////////    
    glcanvas.repaint = function() {
        var gl = glcanvas.gl;
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        var pMatrix = mat4.create();
        mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, glcanvas.camera.R/100.0, Math.max(glcanvas.farDist, glcanvas.camera.R*2));
        var mvMatrix = glcanvas.camera.getMVMatrix();
        glcanvas.gl.lineWidth(10.0);
        glcanvas.drawer.repaint(pMatrix, mvMatrix);
    }
    
    /////////////////////////////////////////////////////
    //Step 2: Setup mouse callbacks
    /////////////////////////////////////////////////////
    glcanvas.getMousePos = function(evt) {
        var rect = this.getBoundingClientRect();
        return {
            X: evt.clientX - rect.left,
            Y: evt.clientY - rect.top
        };
    }
    
    glcanvas.releaseClick = function(evt) {
        evt.preventDefault();
        this.dragging = false;
        requestAnimFrame(this.repaint);
        return false;
    } 

    glcanvas.mouseOut = function(evt) {
        this.dragging = false;
        requestAnimFrame(this.repaint);
        return false;
    }
    
    glcanvas.makeClick = function(e) {
        var evt = (e == null ? event:e);
        glcanvas.clickType = "LEFT";
        evt.preventDefault();
        if (evt.which) {
            if (evt.which == 3) glcanvas.clickType = "RIGHT";
            if (evt.which == 2) glcanvas.clickType = "MIDDLE";
        }
        else if (evt.button) {
            if (evt.button == 2) glcanvas.clickType = "RIGHT";
            if (evt.button == 4) glcanvas.clickType = "MIDDLE";
        }
        this.dragging = true;
        this.justClicked = true;
        var mousePos = this.getMousePos(evt);
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        requestAnimFrame(this.repaint);
        return false;
    } 

    //http://www.w3schools.com/jsref/dom_obj_event.asp
    glcanvas.clickerDragged = function(evt) {
        evt.preventDefault();
        var mousePos = this.getMousePos(evt);
        var dX = mousePos.X - this.lastX;
        var dY = mousePos.Y - this.lastY;
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        if (this.dragging) {
            //Translate/rotate shape
            if (glcanvas.clickType == "MIDDLE") {
                this.camera.translate(dX, -dY);
            }
            else if (glcanvas.clickType == "RIGHT") { //Right click
                this.camera.zoom(dY); //Want to zoom in as the mouse goes up
            }
            else if (glcanvas.clickType == "LEFT") {
                this.camera.orbitLeftRight(dX);
                this.camera.orbitUpDown(-dY);
            }
            requestAnimFrame(this.repaint);
        }
        return false;
    }    
    
    /////////////////////////////////////////////////////
    //Step 3: Initialize Web GL
    /////////////////////////////////////////////////////
    glcanvas.addEventListener('mousedown', glcanvas.makeClick);
    glcanvas.addEventListener('mouseup', glcanvas.releaseClick);
    glcanvas.addEventListener('mousemove', glcanvas.clickerDragged);
    glcanvas.addEventListener('mouseout', glcanvas.mouseOut);

    //Support for mobile devices
    glcanvas.addEventListener('touchstart', glcanvas.makeClick);
    glcanvas.addEventListener('touchend', glcanvas.releaseClick);
    glcanvas.addEventListener('touchmove', glcanvas.clickerDragged);

    try {
        //this.gl = WebGLDebugUtils.makeDebugContext(this.glcanvas.getContext("experimental-webgl"));
        glcanvas.gl = glcanvas.getContext("experimental-webgl");
        glcanvas.gl.viewportWidth = glcanvas.width;
        glcanvas.gl.viewportHeight = glcanvas.height;
    } catch (e) {
        console.log(e);
    }
    if (!glcanvas.gl) {
        alert("Could not initialise WebGL, sorry :-(.  Try a new version of chrome or firefox and make sure your newest graphics drivers are installed");
    }
    
    glcanvas.shaders = initShaders(glcanvas.gl, false);
    glcanvas.drawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);
    
    requestAnimFrame(glcanvas.repaint);
}
