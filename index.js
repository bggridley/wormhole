/*
Written by Ben Gridley
Started/finished week of 10/24/21
*/

var gl;
var programInfo;
var eye;  
var up;
var direction;
var torusBuffers;
var torus;
var e = 0;
var rad1 = 0.75;
var rad2 = 0.25;
var seg1 = 100;
var seg2 = 200;
var torusRotation = 0;
var loaded = false;
var clearColor = [240 / 255, 255 / 255, 255 / 255, 1.0];

$(document).ready(function () {
    loadWebGL();
});

class WorldObject {

    constructor(x, y, z) {
        this.onGround = false;
        this.x = x;
        this.y = y;
        this.z = z;
        this.scale = vec3.fromValues(1.0, 1.0, 1.0);
        this.reflectiveness = 1.0;
    }

    draw(gl, projectionMatrix, viewMatrix) {
        const modelViewMatrix = mat4.create();

        mat4.translate(modelViewMatrix,   
            modelViewMatrix,    
            [this.x, this.y, this.z]); 
        mat4.rotate(modelViewMatrix,
            modelViewMatrix, 
            torusRotation,
            [0, -1, 0]); 

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        mat4.scale(modelViewMatrix, modelViewMatrix, this.scale);

        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal);
        }

        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertexColor);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexColor);
        }


        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
        gl.useProgram(programInfo.program);

        gl.uniform1f(programInfo.uniformLocations.reflectiveness, this.reflectiveness);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        {
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, this.buffers.vertexCount, type, offset);
        }
    }
};

class Torus extends WorldObject {

    constructor(x, y, z) {
        super(x, y, z);
        this.buffers = torusBuffers;
        this.scale = [7.5, 7.5, 7.5];
        this.reflectiveness = 1;
    }

    draw(gl, projectionMatrix, viewMatrix) {
        super.draw(gl, projectionMatrix, viewMatrix);
    }
}

function loadWebGL() {
    if (!loaded) loaded = true; else return;

    const canvas = document.querySelector('#glcanvas');
    $('#glcanvas').css('style', ' box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);')
    gl = canvas.getContext('webgl', { antialias: true });

    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();

    if (!gl) {
        alert('Unable to initialize WebGL.');
        return;
    }

    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec3 aVertexNormal;
      attribute vec2 aTextureCoord;
      attribute vec3 aVertexColor;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;

      uniform highp float uReflectiveness;

      varying highp vec3 vLighting;
      varying highp vec3 vVertexNormal;
      varying highp vec3 vVertexColor;

      void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelViewMatrix * aVertexPosition;

        highp vec3 ambientLight = vec3(0.7, 0.7, 0.7);
        highp vec3 directionalLightColor = vec3(abs(aVertexPosition[1] * 4.0), abs(aVertexPosition[1] * 4.0), abs(aVertexPosition[1] * 4.0));
        highp vec3 directionalVector = normalize(vec3(-aVertexPosition[0], -aVertexPosition[1], -aVertexPosition[2]));
  
        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
  
        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional * uReflectiveness);

        vVertexNormal = aVertexNormal;
        vVertexColor = aVertexColor;
      }
    `;


    const fsSource = `
    varying highp vec3 vLighting;
    varying highp vec3 vVertexNormal;
    varying highp vec3 vVertexColor;

      void main() {
            gl_FragColor = vec4(vVertexColor.xyz * vLighting, 1.0);
      }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            reflectiveness: gl.getUniformLocation(shaderProgram, 'uReflectiveness'),
        },
    };

    torusBuffers = initTorusBuffers(gl);
    torus = new Torus(0, 0, 0);

    var xx = (rad1 * torus.scale[0]) * Math.sin(0);
    var yy = 0;
    var zz = (rad1 * torus.scale[0]) * Math.cos(0);

    var thres = 1.75;
    var dx = Math.sin((0) + Math.PI / thres);
    var dz = Math.cos((0) + Math.PI / thres);

    direction = vec3.fromValues(dx, 0, dz);
    eye = vec3.fromValues(xx, yy, zz);
    up = vec3.fromValues(0.0, 1.0, 0);

    window.requestAnimationFrame(loop);
}

function loop(timestamp) {
    window.requestAnimationFrame(loop);
    drawScene();
    update();
}

function update() {
    e += 0.005;
    torusRotation += 1 / 100;
    up = vec3.fromValues(0.0, Math.sin(e), Math.cos(e));

}

function drawScene() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = (140) * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000.0;
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    var center = vec3.create();
    vec3.add(center, eye, direction);
    mat4.lookAt(viewMatrix, eye, center, up);
    mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);

    torus.draw(gl, projectionMatrix, viewMatrix);
}

function resizeCanvas() {
    var w = $('body').innerWidth();
    var h = $('body').innerHeight();
    gl.canvas.width = w;
    gl.canvas.height = h;
    $("#glCanvas").attr('width', w);
    $("#glCanvas").attr('height', h);

    var c = document.querySelector("#glCanvas");
    c.style.width = w;
    c.style.height = h;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('Error occurred during shader compilation: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function initTorusBuffers(gl) {
    const positions = [];
    const indices = [];
    const vertexNormals = [];
    const vertexColors = [];

    for (var i = 0; i < seg1; i++) {
        var inc = 2 * Math.PI / seg1;

        for (var j = 0; j < seg2; j++) {
            var inc2 = 2 * Math.PI / seg2;

            var sxx = (rad1 + (rad2 * Math.cos(j * inc2))) * Math.sin(i * inc);
            var szz = (rad1 + (rad2 * Math.cos(j * inc2))) * Math.cos(i * inc);
            var syy = rad2 * Math.sin(j * inc2);

            var cxx = rad1 * Math.sin(i * inc);
            var czz = rad1 * Math.cos(i * inc);
            var cyy = 0;

            var dxx = cxx - sxx;
            var dzz = czz - szz;
            var dyy = cyy - syy;

            positions.push(sxx);
            positions.push(syy);
            positions.push(szz);

            vertexNormals.push(dxx);
            vertexNormals.push(dyy);
            vertexNormals.push(dzz);

            if (Math.random() > 0.04) {
                vertexColors.push(0.1 + Math.random());
                vertexColors.push(Math.random() / 4);
                vertexColors.push(Math.random());
            } else {
                vertexColors.push(1.0);
                vertexColors.push(1.0);
                vertexColors.push(0.7);
            }
        }

    }

    for (var i = 0; i < seg1 - 1; i++) {
        for (var j = 0; j < seg2; j++) {
            var s = (i) * seg2;
            var next = s + seg2;
            if (i == seg1 - 2) next = 0;
            var n1 = next + 1;

            if (j + s + 1 == (seg1 - 1) * seg2) {
                indices.push(j + s);
                indices.push(j + next);
                indices.push(s);
                indices.push(j + next);
                indices.push(s);
                indices.push(j + next + 1);
            } else {
                indices.push(j + s);
                indices.push(j + next);
                indices.push(j + s + 1);

                if (j == seg2 - 1) {
                    s -= seg2;
                    next -= seg2;
                }

                indices.push(j + next);
                indices.push(j + s + 1);
                indices.push(j + next + 1);
            }
        }
    }

    return initBuffers(gl, positions, indices, vertexNormals, vertexColors, indices.length);//positions.length * 2);
}

function initBuffers(gl, positions, indices, vertexNormals, vertexColors, vertices) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals),
        gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors),
        gl.STATIC_DRAW);

    return {
        vertexCount: vertices,
        position: positionBuffer,
        indices: indexBuffer,
        normal: normalBuffer,
        vertexColor: colorBuffer,
    };
}