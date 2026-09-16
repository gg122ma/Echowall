# KMK building photos

Production building photos live under `assets/buildings/<building-id>/`. Their
only runtime mapping is the `photos` array on the canonical record in
`data/campus-buildings.js`; the first entry is the card/preview/primary image
and later entries form the detail gallery.

## Mapping policy

- `CONFIRMED` photos may be exposed. Exact folder names and harmless
  Malay/English or abbreviation differences qualify when they resolve to one
  canonical facility.
- `LIKELY` and `UNMAPPED` photos remain outside production assets until an
  owner confirms the identity. The UI uses its existing outline fallback.
- Source photos are copied and web-optimized non-destructively. The owner
  archive is not committed or modified.

## Confirmed owner-archive mappings

| Source folder | Canonical building | Photos |
| --- | --- | ---: |
| Blok Kediaman Ketua Jabatan | `B_BLOK_KETUA_JABATAN` | 5 |
| Cafe Admin | `B_KAFETERIA_PENTADBIRAN` | 4 |
| Cafe B | `B_KAFETERIA_B` | 4 |
| Cafe C | `B_KAFETERIA_C` | 5 |
| Garaj Bas | `B_GARAJ` | 5 |
| Gelanggang Bola Keranjang | `B_BASKETBALL_NW` | 4 |
| Gelanggang Tenis | `B_TENNIS_NW` | 5 |
| Kediaman Pensyarah P1 | `B_KP_P1` | 3 |
| Kediaman Pensyarah P2 | `B_KP_P2` | 3 |
| Kediaman Pensyarah P3 | `B_KP_P3` | 3 |
| Kediaman Pensyarah P4 | `B_KP_P4` | 3 |
| Koop Mart + Pos Mini | `B_KOOP` (`Koperasi & Pejabat Pos`) | 8 |
| Pencawang Elektrik 1 | `B_PENCAWANG_1` | 3 |
| Pencawang Elektrik 2 | `B_PENCAWANG_2` | 3 |
| Pondok Pengawal Barat | `B_GUARD_W` | 3 |
| Pondok Pengawal Selatan | `B_GUARD_S` | 4 |
| Serambi | `B_SERAMBI` | 4 |

## Not exposed

| Source | Photos | Reason |
| --- | ---: | --- |
| Gelanggang Bola Jaring | 6 | No distinct canonical netball-court record. |
| Gelanggang Bola Tampar | 5 | No distinct canonical volleyball-court record. |
| Kediaman Kakitangan | 3 | No canonical staff-residence record with this identity. |
| Kediaman Pensyarah | 3 | Generic name cannot be assigned safely to P1, P2, P3, or P4. |
| ParkirBlokC.jpg | 1 | No canonical Block C parking entity. |

Run `node scripts/test-building-photos.mjs` to prove that every configured
photo exists, uses a supported file type, is mapped once, and has no orphaned
counterpart in the production building-asset directory.
