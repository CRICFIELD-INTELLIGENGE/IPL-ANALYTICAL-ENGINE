# IPL Player Portrait & Jersey Verification Audit Report

Generated on: 2026-10-09T13:10:43.267Z

This audit tests the 4-tier photo resolution hierarchy and strict jersey integrity guardrail:
1. **exact_verified**: Verified exact-season, exact-franchise kit.
2. **same_franchise_different_season**: Same franchise kit, marked non-season-specific.
3. **neutral_portrait**: Approved neutral/national team cutout without rival franchise branding.
4. **incorrect_jersey**: Player portrait exists, but in a rival/different franchise's kit. STRICT RULE: Image blocked, falls back to initials/silhouette.
5. **missing**: No portrait available in the registry.
6. **rights_pending**: Verified historical portrait with licensing approval pending.

## 1. 2026 Royal Challengers Bengaluru Squad Audit (25 Players)

| Player | Franchise | Season | Image Source | Kit Team | Kit Season | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Virat Kohli** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Josh Hazlewood** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |
| **Phil Salt** | RCB | 2026 | `Initials / Silhouette Fallback` | KKR | 2024 | `incorrect_jersey` |
| **Jitesh Sharma** | RCB | 2026 | `Initials / Silhouette Fallback` | MI | 2024 | `incorrect_jersey` |
| **Rajat Patidar** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Bhuvneshwar Kumar** | RCB | 2026 | `Initials / Silhouette Fallback` | SRH | 2024 | `incorrect_jersey` |
| **Venkatesh Iyer** | RCB | 2026 | `Initials / Silhouette Fallback` | KKR | 2024 | `incorrect_jersey` |
| **Rasikh Salam** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Krunal Pandya** | RCB | 2026 | `Initials / Silhouette Fallback` | LSG | 2024 | `incorrect_jersey` |
| **Mangesh Yadav** | RCB | 2026 | `Initials / Silhouette Fallback` | LSG | 2024 | `incorrect_jersey` |
| **Yash Dayal** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Tim David** | RCB | 2026 | `Initials / Silhouette Fallback` | MI | 2024 | `incorrect_jersey` |
| **Jacob Bethell** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |
| **Suyash Sharma** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Devdutt Padikkal** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Jacob Duffy** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |
| **Nuwan Thushara** | RCB | 2026 | `Initials / Silhouette Fallback` | MI | 2024 | `incorrect_jersey` |
| **Romario Shepherd** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Jordan Cox** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |
| **Swapnil Singh** | RCB | 2026 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | RCB | 2024 | `same_franchise_different_season` |
| **Abhinandan Singh** | RCB | 2026 | `Initials / Silhouette Fallback` | SRH | 2024 | `incorrect_jersey` |
| **Kanishk Chouhan** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |
| **Satvik Deswal** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |
| **Vicky Ostwal** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `incorrect_jersey` |
| **Vihaan Malhotra** | RCB | 2026 | `Initials / Silhouette Fallback` | N/A | N/A | `missing` |

## 2. Historical Multi-Franchise Transfer Integrity Test

| Player | Franchise | Season | Image Source | Kit Team | Kit Season | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Rohit Sharma** | DEC | 2008 | `Initials / Silhouette Fallback` | MI | 2024 | `incorrect_jersey` |
| **Rohit Sharma** | MI | 2024 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | MI | 2024 | `exact_verified` |
| **MS Dhoni** | CSK | 2024 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | CSK | 2024 | `exact_verified` |
| **MS Dhoni** | RPS | 2016 | `Initials / Silhouette Fallback` | CSK | 2024 | `incorrect_jersey` |
| **Pat Cummins** | KKR | 2021 | `Initials / Silhouette Fallback` | SRH | 2024 | `incorrect_jersey` |
| **Pat Cummins** | SRH | 2024 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | SRH | 2024 | `exact_verified` |
| **Bhuvneshwar Kumar** | SRH | 2024 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | SRH | 2024 | `exact_verified` |
| **Bhuvneshwar Kumar** | RCB | 2026 | `Initials / Silhouette Fallback` | SRH | 2024 | `incorrect_jersey` |
| **Hardik Pandya** | GT | 2022 | `Initials / Silhouette Fallback` | MI | 2024 | `incorrect_jersey` |
| **Hardik Pandya** | MI | 2024 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | MI | 2024 | `exact_verified` |
| **KL Rahul** | LSG | 2024 | `https://img1.hscicdn.com/image/upload/f_auto,t_...` | LSG | 2024 | `exact_verified` |
| **KL Rahul** | RCB | 2016 | `Initials / Silhouette Fallback` | LSG | 2024 | `incorrect_jersey` |

## 3. Jersey Integrity Verification Summary

- **Zero Rival Jersey Leaks**: Players such as Bhuvneshwar Kumar (SRH kit), Phil Salt (KKR kit), Krunal Pandya (LSG kit), and Tim David (MI kit) are correctly prevented from displaying rival colors in the 2026 RCB squad.
- **Proper Fallback**: In the absence of an exact RCB kit, initials/silhouette avatar is strictly used.
- **Same Franchise Fallback**: Players like Virat Kohli and Rajat Patidar wearing RCB kits are displayed with the same-franchise badge.
