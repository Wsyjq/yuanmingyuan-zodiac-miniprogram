param(
  [int]$X = 0,
  [int]$Y = 0,
  [switch]$Click,
  [string]$Out = "D:\kc\ymy\test\screen-full.png"
)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class U {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
}
"@
$p = Get-Process wechatdevtools | Where-Object { $_.MainWindowTitle -like '*plate21-proto*' } | Select-Object -First 1
if ($p) {
  [U]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
  [U]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 500
}
if ($Click) {
  [U]::SetCursorPos($X, $Y) | Out-Null
  [U]::mouse_event(2,0,0,0,[IntPtr]::Zero)
  [U]::mouse_event(4,0,0,0,[IntPtr]::Zero)
  Start-Sleep -Milliseconds 900
}
$v = [System.Windows.Forms.SystemInformation]::VirtualScreen
Add-Type -AssemblyName System.Windows.Forms
$v = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $v.Width, $v.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($v.Left, $v.Top, 0, 0, $bmp.Size)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "SAVED $Out $($v.Width)x$($v.Height)"
