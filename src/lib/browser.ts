// Browsers built into other apps (Messenger, Zalo, Instagram…) can't do
// Google sign-in, so we ask the user to open the page in Safari or Chrome.

const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Zalo|Line\/|MicroMessenger|Snapchat|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Twitter|Threads|GSA\//i

export function isInAppBrowser(ua: string = navigator.userAgent): boolean {
  return IN_APP.test(ua)
}
