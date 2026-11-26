package com.example.instalite

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import android.widget.Toast
import org.json.JSONTokener

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var filterJs: String
    private var docStartInjected = false
    private var revealed = false

    private val home = "https://www.instagram.com/"
    private val blockedPath = Regex("^/(reels?|explore)(/.*)?$")
    private val allowedHosts = listOf("instagram.com", "facebook.com") // facebook = optional login

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        filterJs = assets.open("filter.js").bufferedReader().use { it.readText() }

        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            visibility = View.INVISIBLE   // stays hidden until the filtered page is ready
        }
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Look like normal mobile Chrome (no "wv" marker) so Instagram serves its full mobile site
            userAgentString = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(web, true)
        }

        // Best case: script runs before the page's own JS, so nothing flashes.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(web, filterJs, setOf("https://*.instagram.com"))
            docStartInjected = true
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val host = uri.host ?: return true
                val ok = allowedHosts.any { host == it || host.endsWith(".$it") }
                if (!ok) {
                    startActivity(Intent(Intent.ACTION_VIEW, uri)) // external links -> real browser
                    return true
                }
                if (host.endsWith("instagram.com") && blockedPath.matches(uri.path ?: "")) {
                    view.loadUrl(home)
                    return true
                }
                return false
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                if (!docStartInjected) view.evaluateJavascript(filterJs, null)
            }

            override fun onPageFinished(view: WebView, url: String?) {
                view.evaluateJavascript(filterJs, null) // idempotent
                if (!revealed) {
                    revealed = true
                    view.postDelayed({ view.visibility = View.VISIBLE }, 400)
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })

        web.loadUrl(home)
    }

    override fun onPause() { super.onPause(); CookieManager.getInstance().flush() }

    // Debug aid: hold Volume Up to copy an outline of the current page to the clipboard
    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP && event.repeatCount == 8) { copyDump(); return true }
        return super.onKeyDown(keyCode, event)
    }

    private fun copyDump() {
        web.evaluateJavascript("(window.__igDump ? window.__igDump() : 'no dump')") { r ->
            val text = try { JSONTokener(r).nextValue().toString() } catch (e: Exception) { r ?: "" }
            (getSystemService(CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("page", text))
            Toast.makeText(this, "Page outline copied", Toast.LENGTH_SHORT).show()
        }
    }
}
