// WebCrypto (crypto.subtle) for GUN SEA on React Native.
// The crypto runs inside a hidden WebView; calls are forwarded to it with webview-crypto.
// Importing this file installs crypto.subtle, rendering <CryptoBridge /> starts the WebView.
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MainWorker, webViewWorkerString } from 'webview-crypto';

const LOG = 'crypto-bridge-log:';
const SUBTLE_METHODS = [
  'encrypt', 'decrypt', 'sign', 'verify', 'digest', 'generateKey',
  'deriveKey', 'deriveBits', 'importKey', 'exportKey', 'wrapKey', 'unwrapKey',
];

let worker;        // MainWorker of the mounted WebView
let waiting = [];  // calls made before the WebView was mounted

const withWorker = () =>
  new Promise((resolve) => (worker ? resolve(worker) : waiting.push(resolve)));

const subtle = { fake: true };
SUBTLE_METHODS.forEach((method) => {
  subtle[method] = (...args) => withWorker().then((w) => w.crypto.subtle[method](...args));
});

if (typeof global.crypto !== 'object') {
  global.crypto = {};
}
// tells webview-crypto to keep keys in their serialized form on this side
global.crypto.fake = true;
if (typeof global.crypto.subtle !== 'object') {
  global.crypto.subtle = subtle;
}

const page = `<html><body><script>
(function () {
  function report(text) {
    try { window.ReactNativeWebView.postMessage('${LOG}' + text); } catch (e) {}
  }
  window.onerror = function (message) { report('page error: ' + message); };
  try {
    if (!(window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle))) {
      report('this WebView has no crypto.subtle');
    }
    ${webViewWorkerString};
    function post(message) {
      if (!window.ReactNativeWebView || window.ReactNativeWebView.postMessage === undefined) {
        setTimeout(post, 200, message);
      } else {
        window.ReactNativeWebView.postMessage(message);
      }
    }
    var wvw = new WebViewWorker(post);
    var last;
    function onMessage(e) {
      if (e === last) { return; }
      last = e;
      wvw.onMainMessage(e.data);
    }
    // android delivers on document, ios on window
    window.document.addEventListener('message', onMessage);
    window.addEventListener('message', onMessage);
  } catch (e) {
    report('page setup failed: ' + e);
  }
}());
</script></body></html>`;

function CryptoBridge() {
  const webViewRef = useRef(null);

  useEffect(() => {
    worker = new MainWorker((message) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(message);
      }
    });
    waiting.splice(0).forEach((resolve) => resolve(worker));
    return () => {
      worker = undefined;
    };
  }, []);

  const onMessage = (event) => {
    const data = event.nativeEvent.data;
    if (data.startsWith(LOG)) {
      console.log('[crypto] WebView: ' + data.slice(LOG.length));
      return;
    }
    if (worker) {
      worker.onWebViewMessage(data);
    }
  };

  return (
    <View style={styles.hide} pointerEvents="none">
      <WebView
        ref={webViewRef}
        javaScriptEnabled={true}
        originWhitelist={['*']}
        // about:blank has no crypto.subtle on android, an https origin does
        source={{ html: page, baseUrl: 'https://localhost' }}
        onMessage={onMessage}
        onLoadEnd={() => console.log('[crypto] WebView page loaded')}
        onError={(e) => console.log('[crypto] WebView load error: ' + e.nativeEvent.description)}
        onHttpError={(e) => console.log('[crypto] WebView http error: ' + e.nativeEvent.statusCode)}
        onRenderProcessGone={() => console.log('[crypto] WebView process gone')}
      />
    </View>
  );
}

// Kept in the layout at 1x1 and transparent: a WebView under display "none" may never load.
const styles = StyleSheet.create({
  hide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default CryptoBridge;
