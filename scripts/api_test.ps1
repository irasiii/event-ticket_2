$base = "https://35.168.59.22"

# List events
Invoke-WebRequest -Uri "$base/api/events" -SkipCertificateCheck

# Register user
Invoke-WebRequest -Uri "$base/api/auth/register" -Method POST `
  -Body '{"name":"User","email":"test@t.com","password":"Pass123!","role":"user"}' `
  -ContentType "application/json" -SkipCertificateCheck

# Login
Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST `
  -Body '{"email":"admin@example.com","password":"admin123"}' `
  -ContentType "application/json" -SkipCertificateCheck

# With token
$token = (Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST `
  -Body '{"email":"admin@example.com","password":"admin123"}' `
  -ContentType "application/json" -SkipCertificateCheck).Content `
  | ConvertFrom-Json | Select -Expand token
Invoke-WebRequest -Uri "$base/api/bookings" -Headers @{Authorization="Bearer $token"} `
  -SkipCertificateCheck
