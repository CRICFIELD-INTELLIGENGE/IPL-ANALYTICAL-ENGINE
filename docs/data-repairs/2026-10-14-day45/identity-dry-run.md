# Identity corrections — dry run (2026-10-14)

Bios: 862 → 856

## P1a: fold arshad-khan-(2) → arshad-khan

Registry id: 12314277

Checks:
- arshad-khan → 12314277 by the shared identity rules
- arshad-khan-(2) → 12314277 by the shared identity rules
- 12314277: 27 IPL appearances (Mumbai Indians, Lucknow Super Giants, Gujarat Titans)

Changes:
- kept arshad-khan.playerId = "8389" (arshad-khan-(2) had "10707")
- kept arshad-khan.playerName = "Arshad Khan" (arshad-khan-(2) had "Arshad Khan (2)")
- kept arshad-khan.fullName = "Arshad Khan" (arshad-khan-(2) had "Mohd Arshad Khan")
- kept arshad-khan.role = "bowler" (arshad-khan-(2) had "all-rounder")
- kept arshad-khan.team = "Gujarat Titans" (arshad-khan-(2) had "Lucknow Super Giants")
- kept arshad-khan.currentTeam = "Gujarat Titans" (arshad-khan-(2) had "Lucknow Super Giants")
- removed bio arshad-khan-(2)

## P1b: fold na-saini → navdeep-saini

Registry id: 21d4e29b

Checks:
- navdeep-saini → 21d4e29b by the shared identity rules
- na-saini → 21d4e29b by the shared identity rules
- 21d4e29b: 34 IPL appearances (Royal Challengers Bangalore, Rajasthan Royals, Kolkata Knight Riders)

Changes:
- kept navdeep-saini.playerId = "2703" (na-saini had "8356")
- kept navdeep-saini.playerName = "N Saini" (na-saini had "Navdeep Saini")
- kept navdeep-saini.fullName = "Navdeep Saini" (na-saini had "Navdeep Amarjeet Saini")
- kept navdeep-saini.batStyle = "Right-hand bat" (na-saini had "Right hand Bat")
- kept navdeep-saini.team = "Kolkata Knight Riders" (na-saini had "Rajasthan Royals")
- kept navdeep-saini.currentTeam = "Kolkata Knight Riders" (na-saini had "Rajasthan Royals")
- navdeep-saini.playerName "N Saini" → "NA Saini"
- removed bio na-saini

## P1c: fold pwh-de-silva → wanindu-hasaranga

Registry id: a97c8ec2

Checks:
- wanindu-hasaranga → a97c8ec2 by the shared identity rules
- pwh-de-silva → a97c8ec2 by the shared identity rules
- a97c8ec2: 37 IPL appearances (Royal Challengers Bangalore, Rajasthan Royals)

Changes:
- kept wanindu-hasaranga.playerId = "78239" (pwh-de-silva had "5980")
- kept wanindu-hasaranga.playerName = "PW Hasaranga" (pwh-de-silva had "PWH de Silva")
- kept wanindu-hasaranga.fullName = "Wanindu Hasaranga" (pwh-de-silva had "Pinnaduwage Wanindu Hasaranga de Silva")
- kept wanindu-hasaranga.batStyle = "Right-hand bat" (pwh-de-silva had "Right hand Bat")
- kept wanindu-hasaranga.role = "bowler" (pwh-de-silva had "all-rounder")
- kept wanindu-hasaranga.team = "Lucknow Super Giants" (pwh-de-silva had "Rajasthan Royals")
- kept wanindu-hasaranga.currentTeam = "Lucknow Super Giants" (pwh-de-silva had "Rajasthan Royals")
- removed bio pwh-de-silva

## P2: fold abhishek-porel → abishek-porel

Registry id: ad3b6e95

Checks:
- squads 2025, 2026 Delhi Capitals: 'Abhishek Porel' → cricsheetName 'Abishek Porel'
- abishek-porel → ad3b6e95 by the shared identity rules
- abhishek-porel has no verified identity (spelling variant)
- ad3b6e95: 36 IPL appearances (Delhi Capitals)

Changes:
- kept abishek-porel.playerName = "Abishek Porel" (abhishek-porel had "Abhishek Porel")
- kept abishek-porel.fullName = "Abishek Porel" (abhishek-porel had "Abhishek Porel")
- abishek-porel.image "https://www.espncricinfo.com/cricketers/abishek-porel-1277545" (a web page, not an image) → "/players/dc-2026/abhishek-porel.webp"
- abishek-porel.country filled from abhishek-porel: "India"
- removed bio abhishek-porel

## P3: remove tejaswi-dahiya, tejasvi-dahiya (identical to tejasvi-singh)

Registry id: — (none asserted)

Checks:
- all three bios byte-identical
- none has a verified identity
- NOT asserted: Tejasvi Singh Dahiya = T Dahiya (f12fe2a1)

Changes:
- removed bio tejaswi-dahiya
- removed bio tejasvi-dahiya

## P4a: squad 2023 Kolkata Knight Riders 'Shreyas Iyer'

Registry id: — (none asserted)

Checks:
- 'VR Iyer' is a24be938 (who played in 2023), a different person
- Shreyas Iyer → 85ec8e33 (register + squad rows SS Iyer): no 2023 IPL appearance

Changes:
- {"cricsheetName":"VR Iyer","played":true} → {"cricsheetName":null,"played":false}

## P4b: squad 2016 Mumbai Indians 'Jitesh Sharma'

Registry id: — (none asserted)

Checks:
- 'RG Sharma' is 740742ef (who played in 2016), a different person
- Jitesh Sharma → 800d2d97 (register + squad rows JM Sharma): no 2016 IPL appearance

Changes:
- {"cricsheetName":"RG Sharma","played":true} → {"cricsheetName":null,"played":false}

## P4c: squad 2024 Gujarat Titans 'Jayant Yadav'

Registry id: — (none asserted)

Checks:
- 'UT Yadav' is cc1e8c68 (who played in 2024), a different person
- Jayant Yadav → 81049310 (register + squad rows J Yadav): no 2024 IPL appearance

Changes:
- {"cricsheetName":"UT Yadav","played":true} → {"cricsheetName":null,"played":false}

## P5: alias pathum-nissanka → 8ee36b18

Registry id: 8ee36b18

Checks:
- register name/variant 'Pathum Nissanka' belongs only to 8ee36b18
- 10 IPL appearances

Changes:
- alias added (reviewed 2026-10-14)

## P5: alias jayant-yadav → 81049310

Registry id: 81049310

Checks:
- register name/variant 'Jayant Yadav' belongs only to 81049310
- 20 IPL appearances

Changes:
- alias added (reviewed 2026-10-14)

## P5: alias keshav-maharaj → 0b60eb09

Registry id: 0b60eb09

Checks:
- register name/variant 'Keshav Maharaj' belongs only to 0b60eb09
- 2 IPL appearances

Changes:
- alias added (reviewed 2026-10-14)

## P5: alias ben-dwarshuis → e1b9f3a9

Registry id: e1b9f3a9

Checks:
- register name/variant 'Ben Dwarshuis' belongs only to e1b9f3a9
- 1 IPL appearances

Changes:
- alias added (reviewed 2026-10-14)

## P5: alias richard-gleeson → 402f8494

Registry id: 402f8494

Checks:
- register name/variant 'Richard Gleeson' belongs only to 402f8494
- 3 IPL appearances

Changes:
- alias added (reviewed 2026-10-14)

## P5: alias lhuan-dre-pretorius → 60aa2db3

Registry id: 60aa2db3

Checks:
- register name/variant 'Lhuan-dre Pretorius' belongs only to 60aa2db3
- 2 IPL appearances

Changes:
- alias added (reviewed 2026-10-14)
