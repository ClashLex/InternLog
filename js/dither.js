/* Minimal homepage adaptation of the supplied React Bits Dither effect.
 * MIT + Commons Clause License Condition v1.0 — Copyright (c) 2026 David Haz.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software as part of an
 * application, website, or product, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * Commons Clause Restriction: You may use this Software, including for any
 * commercial purpose, so long as you do not sell, sublicense, or redistribute
 * the components themselves-whether alone, in a bundle, or as a ported version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE. Upstream: https://github.com/DavidHDev/react-bits
 */
(function () {
  "use strict";
  var VERTEX = "#version 300 es\nin vec2 aPosition;\nvoid main(){gl_Position=vec4(aPosition,0.0,1.0);}";
  // The supplied wave + Bayer passes are combined for this deliberately small,
  // transparent, monochrome effect. No trail, ripple, intro or palette passes.
  var FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform vec3 uInk;
out vec4 outColor;
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec2 fade(vec2 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec2 p){
  vec4 pi=floor(p.xyxy)+vec4(0.0,0.0,1.0,1.0);
  vec4 pf=fract(p.xyxy)-vec4(0.0,0.0,1.0,1.0);
  pi=mod289(pi);
  vec4 ix=pi.xzxz,iy=pi.yyww,fx=pf.xzxz,fy=pf.yyww;
  vec4 i=permute(permute(ix)+iy);
  vec4 gx=fract(i*(1.0/41.0))*2.0-1.0;
  vec4 gy=abs(gx)-0.5;
  gx-=floor(gx+0.5);
  vec2 g00=vec2(gx.x,gy.x),g10=vec2(gx.y,gy.y);
  vec2 g01=vec2(gx.z,gy.z),g11=vec2(gx.w,gy.w);
  vec4 norm=taylorInvSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));
  g00*=norm.x;g01*=norm.y;g10*=norm.z;g11*=norm.w;
  vec2 nx=mix(vec2(dot(g00,vec2(fx.x,fy.x)),dot(g01,vec2(fx.z,fy.z))),
              vec2(dot(g10,vec2(fx.y,fy.y)),dot(g11,vec2(fx.w,fy.w))),fade(pf.xy).x);
  return 2.3*mix(nx.x,nx.y,fade(pf.xy).y);
}
float fbm(vec2 p){
  float value=0.0,amp=1.0;
  for(int i=0;i<3;i++){value+=amp*abs(cnoise(p));p*=3.0;amp*=0.3;}
  return value;
}
const float bayer4[16]=float[16](0.0,8.0,2.0,10.0,12.0,4.0,14.0,6.0,3.0,11.0,1.0,9.0,15.0,7.0,13.0,5.0);
void main(){
  vec2 cell=floor(gl_FragCoord.xy/uCell);
  vec2 uv=(cell+0.5)*uCell/uResolution-0.5;
  uv.x*=uResolution.x/uResolution.y;
  float field=fbm(uv+fbm(uv-uTime*0.008));
  ivec2 tile=ivec2(mod(cell,4.0));
  float threshold=(bayer4[tile.y*4+tile.x]+0.5)/16.0;
  float mark=step(threshold,clamp(field*0.65,0.0,0.65));
  outColor=vec4(uInk*mark,mark);
}`;

  function init() {
    var canvas = document.getElementById("homepageDither");
    var button = document.getElementById("backgroundMotion");
    if (!canvas || !button || canvas.dataset.initialized) return;
    canvas.dataset.initialized = "true";
    var gl;
    try { gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" }); }
    catch (error) { return; }
    if (!gl) return;
    var shaders = [], program = null, buffer = null, vao = null;
    function release() {
      shaders.forEach(function (shader) { gl.deleteShader(shader); });
      shaders = [];
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      if (vao) gl.deleteVertexArray(vao);
    }
    function compile(type, source) {
      var shader = gl.createShader(type);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader unsupported");
      return shader;
    }
    try {
      var vertex = compile(gl.VERTEX_SHADER, VERTEX), fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
      program = gl.createProgram();
      if (!program) throw new Error("Program unavailable");
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, "aPosition"); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program unsupported");
      shaders.forEach(function (shader) { gl.deleteShader(shader); }); shaders = [];
      buffer = gl.createBuffer(); vao = gl.createVertexArray();
      if (!buffer || !vao) throw new Error("Buffer unavailable");
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    } catch (error) { release(); return; }

    var resolution = gl.getUniformLocation(program, "uResolution"), cell = gl.getUniformLocation(program, "uCell");
    var clock = gl.getUniformLocation(program, "uTime"), ink = gl.getUniformLocation(program, "uInk");
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var paused = false, destroyed = false, raf = 0, last = null, time = 0, ratio = 1;
    var inkColor = [0, 0, 0];
    function render() {
      if (destroyed || gl.isContextLost()) return;
      gl.useProgram(program); gl.bindVertexArray(vao);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform1f(cell, Math.max(1, 3 * ratio));
      gl.uniform1f(clock, time); gl.uniform3fv(ink, inkColor); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function stop() { if (raf) window.cancelAnimationFrame(raf); raf = 0; last = null; }
    function frame(now) {
      raf = 0;
      if (destroyed || paused || motion.matches || document.hidden) { last = null; return; }
      if (last === null || now - last >= 50) { // Cap GPU drawing at 20 fps.
        time += last === null ? 0 : Math.min((now - last) / 1000, .1);
        last = now; render();
      }
      raf = window.requestAnimationFrame(frame);
    }
    function wake() {
      if (!destroyed && !raf && !paused && !motion.matches && !document.hidden) raf = window.requestAnimationFrame(frame);
    }
    function resize() {
      ratio = Math.min(1, 720 / Math.max(1, window.innerWidth), 480 / Math.max(1, window.innerHeight));
      canvas.width = Math.max(1, Math.round(window.innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(window.innerHeight * ratio));
      render();
    }
    function theme() {
      var channels = getComputedStyle(document.body).color.match(/[\d.]+/g);
      inkColor = channels ? channels.slice(0, 3).map(function (channel) { return Math.min(1, Number(channel) / 255); }) : [0, 0, 0];
      render();
    }
    function sync() {
      stop();
      button.hidden = motion.matches;
      button.setAttribute("aria-pressed", String(!paused));
      button.textContent = paused ? "Background motion: off" : "Background motion: on";
      render(); wake();
    }
    function toggle() { paused = !paused; sync(); }
    function visibility() { stop(); wake(); }
    function pagehide(event) { if (event.persisted) stop(); else destroy(); }
    function contextLost(event) { event.preventDefault(); destroy(); }
    var observer = new MutationObserver(theme);
    function destroy() {
      if (destroyed) return;
      destroyed = true; stop(); observer.disconnect();
      canvas.hidden = true; button.hidden = true;
      button.removeEventListener("click", toggle);
      window.removeEventListener("resize", resize); window.removeEventListener("pagehide", pagehide); window.removeEventListener("pageshow", wake);
      document.removeEventListener("visibilitychange", visibility); canvas.removeEventListener("webglcontextlost", contextLost);
      if (motion.removeEventListener) motion.removeEventListener("change", sync);
      release();
    }
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    button.addEventListener("click", toggle);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pagehide", pagehide); window.addEventListener("pageshow", wake);
    document.addEventListener("visibilitychange", visibility); canvas.addEventListener("webglcontextlost", contextLost);
    if (motion.addEventListener) motion.addEventListener("change", sync);
    resize(); theme(); sync(); canvas.hidden = false;
  }
  document.addEventListener("DOMContentLoaded", init);
})();
