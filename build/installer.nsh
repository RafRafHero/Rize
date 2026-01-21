!macro customInstall
  # 1. Register for StartMenuInternet (The 'Browser' list)
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Rizo" "" "Rizo"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Rizo\Capabilities" "ApplicationName" "Rizo"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Rizo\Capabilities" "ApplicationDescription" "Rizo Web Browser"
  
  # 2. Map protocols to the RizoHTML/URL class
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Rizo\Capabilities\URLAssociations" "http" "RizoURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Rizo\Capabilities\URLAssociations" "https" "RizoURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Rizo\Capabilities\FileAssociations" ".html" "RizoURL"
  
  # 3. Create the actual RizoURL class
  WriteRegStr HKCU "Software\Classes\RizoURL" "" "Rizo URL"
  WriteRegStr HKCU "Software\Classes\RizoURL\DefaultIcon" "" "$INSTDIR\Rizo.exe,0"
  WriteRegStr HKCU "Software\Classes\RizoURL\shell\open\command" "" '"$INSTDIR\Rizo.exe" "%1"'
  
  # 4. Final registration with Windows
  WriteRegStr HKCU "Software\RegisteredApplications" "Rizo" "Software\Clients\StartMenuInternet\Rizo\Capabilities"
!macroend
