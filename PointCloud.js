function getShader(gl, shadersrc, type) {
    var shader;
    if (type == "fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } 
    else if (type == "vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } 
    else {
        return null;
    }
    
    gl.shaderSource(shader, shadersrc);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("Unable to compile " + type + " shader...")
        console.log(shadersrc);
        console.log(gl.getShaderInfoLog(shader));
        alert("Could not compile shader");
        return null;
    }
    return shader;
}

var PointShader_Fragment = "precision mediump float;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_FragColor = fColor;\n" + 
"}\n";

var PointShader_Vertex = "attribute vec3 vPos;\n" + 
"attribute vec4 vColor;\n" + 
"uniform mat4 uMVMatrix;\n" + 
"uniform mat4 uPMatrix;\n" + 
"uniform float pSize;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_PointSize = 5.0; //TODO: Change this to use the uniform pSize\n" + 
"    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);\n" + 
"    fColor = vColor;\n" + 
"}\n";

var shader;


function SimplePCCanvas(glcanvas) {
    glcanvas.gl = null;
    glcanvas.lastX = 0;
    glcanvas.lastY = 0;
    glcanvas.dragging = false;
    glcanvas.justClicked = false;
    glcanvas.camera = new MousePolarCamera(glcanvas.width, glcanvas.height, 0.75);
    glcanvas.clickType = "LEFT";

    //User choices
    glcanvas.drawNormals = false;
    glcanvas.drawEdges = true;
    glcanvas.drawPoints = false;
    
    //Vertex/color buffers
    glcanvas.pointsVBO = null;
    glcanvas.points = [];
    glcanvas.pointsCVBO = null;
    glcanvas.pointsColors = [];
    
    
    glcanvas.updateBuffers = function(points, colors) {
        var gl = glcanvas.gl;
        glcanvas.points = points;
        glcanvas.pointsColors = colors;
        //UPDATE POINTS
        if (glcanvas.pointsVBO === null) {
            glcanvas.pointsVBO = gl.createBuffer();
        }
        if (glcanvas.pointsCVBO === null) {
            glcanvas.pointsCVBO = gl.createBuffer();
        }
        //Bind the array data into the buffers
        var V = new Float32Array(glcanvas.points.length*3);
        for (var i = 0; i < glcanvas.points.length; i++) {
            for (var k = 0; k < 3; k++) {
                V[i*3+k] = glcanvas.points[i][k];
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, glcanvas.pointsVBO);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        glcanvas.pointsVBO.itemSize = 3;
        glcanvas.pointsVBO.numItems = glcanvas.points.length;
        
        V = new Float32Array(glcanvas.pointsColors.length*3);
        for (var i = 0; i < glcanvas.pointsColors.length; i++) {
            for (var k = 0; k < 3; k++) {
                V[i*3+k] = glcanvas.pointsColors[i][k];
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, glcanvas.pointsCVBO);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        glcanvas.pointsCVBO.itemSize = 3;
        glcanvas.pointsCVBO.numItems = glcanvas.pointsColors.length;
    }
    
    glcanvas.loadPointCloud = function(points, colors) {
        //Update buffers
        glcanvas.updateBuffers(points, colors);
        //Center camera
        var P0 = points[0]
        var bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        for (var i = 0; i < points.length; i++) {
            bbox.addPoint(points[i]);
        }
        glcanvas.camera.centerOnBBox(bbox);
        requestAnimFrame(glcanvas.repaint);
    }
    
    /////////////////////////////////////////////////////
    //Step 1: Setup repaint function
    /////////////////////////////////////////////////////    
    glcanvas.repaint = function() {
        var gl = glcanvas.gl;
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        var pMatrix = mat4.create();
        mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, glcanvas.camera.R/100.0, glcanvas.camera.R*2);
        var mvMatrix = glcanvas.camera.getMVMatrix();
        
        if (glcanvas.pointsVBO === null || glcanvas.pointsCVBO === null) {
            return;
        }
        gl.useProgram(shader);
        gl.bindBuffer(gl.ARRAY_BUFFER, glcanvas.pointsVBO);
        gl.vertexAttribPointer(shader.vPosAttrib, glcanvas.pointsVBO.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, glcanvas.pointsCVBO);
        gl.vertexAttribPointer(shader.vColorAttrib, glcanvas.pointsCVBO.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
        gl.uniform1f(shader.pSizeUniform, false, 3.0);
        gl.drawArrays(gl.POINTS, 0, glcanvas.pointsVBO.numItems);
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

    //Initialize shader
    var gl = glcanvas.gl;
    var fragmentShader = getShader(gl, PointShader_Fragment, "fragment");
    var vertexShader = getShader(gl, PointShader_Vertex, "vertex");
    shader = gl.createProgram();
    gl.attachShader(shader, vertexShader);
    gl.attachShader(shader, fragmentShader);
    gl.linkProgram(shader);
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        alert("Could not initialise point shader");
    }
    shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
    gl.enableVertexAttribArray(shader.vPosAttrib);
    shader.vColorAttrib = gl.getAttribLocation(shader, "vColor");
    gl.enableVertexAttribArray(shader.vColorAttrib);
    shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
    shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
    shader.pSizeUniform = gl.getUniformLocation(shader, "pSize");

    glcanvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    glcanvas.gl.enable(glcanvas.gl.DEPTH_TEST);
    
    requestAnimFrame(glcanvas.repaint);
}
