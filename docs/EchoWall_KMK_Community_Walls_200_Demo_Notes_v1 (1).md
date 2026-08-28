# EchoWall KMK 三个社区留言墙：200条演示便贴

> 用途：比赛录屏与GitHub Pages默认展示。全部内容为虚构演示persona和预置demo内容，不是真实学生反馈。

## 1. 总体判断

- 任务类型：`DATA + DOC`
- 风险等级：`L2`
- 变更规模：`S2`
- 准备状态：`READY`
- 执行模式：`STANDARD`

## 2. 最终数量

| KMK社区墙 | orgId | majorId | 数量 | 具名 | 匿名 | BM | EN | 中文 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Sains | 1 | 1 | 73 | 40 | 33 | 44 | 20 | 9 |
| Akaun | 1 | 2 | 62 | 34 | 28 | 37 | 17 | 8 |
| Sains Komputer | 1 | 3 | 65 | 36 | 29 | 39 | 18 | 8 |
| **合计** | — | — | **200** | **110** | **90** | **120** | **55** | **25** |

## 3. 部署契约

- 替换现有KMK community demo seed，不直接追加到旧KMK演示内容。
- 只处理`orgId:1`、`majorId:1/2/3`。
- 不删除普通用户留言。
- 每条使用JSON中的稳定`demoSeedKey`，避免重复。
- seed只作为静态demo author，不创建AuthService账户。
- `batchId:null`，图片字段全部为空。
- 页面标题显示实际runtime留言数，不写死数量。
- 普通用户新增、隐藏或删除留言后，数字应实时变化。

## 4. Codex快速部署步骤

1. 读取`echo-wall-kmk-community-seed.v1.json`。
2. 删除或排除旧KMK demo seed，但保留所有非demo用户留言。
3. 将200条新seed并入默认runtime seed来源。
4. 保留现有其他学院和建筑seed。
5. 验证三墙数量分别为73、62、65。
6. 验证刷新、路由切换及GitHub Pages相对路径。

## 5. 200条完整内容

### Sains（73条）

| # | 语言 | 分类 | 显示作者 | Shape | Color | Rotation | 内容 |
|---:|---|---|---|---|---|---:|---|
| 1 | ms | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | Saya selalu lukis rajah vektor dan tetapkan arah positif. Cara ini membantu saya nampak langkah yang tertinggal. |
| 2 | ms | `academic` | Aarav A. | `square` | `#FFF7ED` | -0.5° | Saya selalu semak paksi, unit dan kecerunan sebelum mentafsir graf. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 3 | ms | `koko` | 匿名 | `rect` | `#CFFAFE` | -2.0° | Saya selalu tulis unit pada setiap langkah pengiraan. Saya tandakan kesilapan supaya tidak berulang. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 4 | zh | `academic` | 匿名 | `circle` | `#FEF08A` | 1.5° | 我通常会先用符号整理公式再代入数值。 之后复查过程也会更清楚。 |
| 5 | ms | `academic` | Aisyah B. | `envelope` | `#FED7AA` | 0° | Saya selalu asingkan data diberi, mol dan nisbah persamaan. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 6 | zh | `academic` | Akif C. | `torn` | `#CBD5E1` | -1.5° | 我通常会计算前先配平方程式。 这样小组讨论会更有条理。 |
| 7 | ms | `academic` | Alia D. | `speech` | `#BFDBFE` | 2.0° | Saya selalu bandingkan trend menggunakan sebab zarah, bukan hafalan arah sahaja. Saya simpan satu contoh lengkap sebagai rujukan. |
| 8 | en | `academic` | Amar E. | `polaroid` | `#FBCFE8` | 0.5° | I usually link bonding type with structure and material properties. A short note like this helps during busy weeks. |
| 9 | zh | `academic` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | 我通常会把过程按位置、步骤和结果整理。 最后再检查单位、标签和题目要求。 |
| 10 | ms | `campus_life` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | Saya selalu buat jadual perbandingan untuk istilah yang hampir sama. Selepas itu saya cuba satu soalan tanpa melihat nota. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 11 | ms | `campus_life` | Amelia F. | `rounded` | `#BBF7D0` | 1.0° | Saya selalu label rajah tanpa melihat nota kemudian semak semula. Cara ini membantu saya nampak langkah yang tertinggal. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 12 | en | `academic` | Anand G. | `square` | `#FFF7ED` | -0.5° | I usually separate genotype, phenotype and probability. The result becomes easier to explain to someone else. |
| 13 | ms | `academic` | 匿名 | `rect` | `#CFFAFE` | -2.0° | Saya selalu tunjukkan langkah algebra satu baris pada satu masa. Saya tandakan kesilapan supaya tidak berulang. |
| 14 | en | `academic` | 匿名 | `circle` | `#FEF08A` | 1.5° | I usually check scale, average and outliers before concluding. The working is also easier to review later. |
| 15 | ms | `campus_life` | Anis H. | `envelope` | `#FED7AA` | 0° | Saya selalu sediakan jadual pemerhatian dan unit sebelum eksperimen bermula. Saya gunakan satu contoh mudah untuk menguji kefahaman. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 16 | ms | `academic` | Aqilah I. | `torn` | `#CBD5E1` | -1.5° | Saya selalu bezakan pemerhatian, inferens dan kesimpulan. Kaedah ini menjadikan perbincangan lebih teratur. |
| 17 | zh | `koko` | 匿名 | `speech` | `#BFDBFE` | 2.0° | 我通常会混合练习交易、调整和报表题。 我会保留一个完整例子作为参考。 小组活动中，每个人都可以带来一个问题或想法。 |
| 18 | ms | `academic` | Arif J. | `polaroid` | `#FBCFE8` | 0.5° | Saya selalu bawa working penuh, bukan hanya jawapan akhir. Nota ringkas ini membantu ketika minggu sibuk. |
| 19 | ms | `academic` | Arissa K. | `ticket` | `#E9D5FF` | -1.0° | Saya selalu tetapkan satu hasil yang boleh diukur untuk setiap sesi. Saya semak semula unit, label dan arahan soalan. |
| 20 | ms | `academic` | Ashwin L. | `hexagon` | `#FDE68A` | 2.5° | Saya selalu guna senarai semakan apabila angka tidak seimbang. Selepas itu saya cuba satu soalan tanpa melihat nota. |
| 21 | ms | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk lukis rajah vektor dan tetapkan arah positif. Working juga menjadi lebih mudah diperiksa semula. |
| 22 | zh | `academic` | 匿名 | `square` | `#FFF7ED` | -0.5° | 常见错误是急着得到最后答案；更稳妥的方法是先检查坐标轴、单位和斜率再解释图像。 我会用一个简单例子检查理解是否正确。 |
| 23 | en | `academic` | Atiqah M. | `rect` | `#CFFAFE` | -2.0° | A common mistake is rushing to the final answer; it is safer to write units at every calculation step. This keeps group discussion more organised. |
| 24 | en | `academic` | Balqis N. | `circle` | `#FEF08A` | 1.5° | A common mistake is rushing to the final answer; it is safer to rearrange the formula symbolically before substituting values. I keep one complete example as a reference. |
| 25 | ms | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk asingkan data diberi, mol dan nisbah persamaan. Nota ringkas ini membantu ketika minggu sibuk. |
| 26 | en | `emotional` | Benji O. | `torn` | `#CBD5E1` | -1.5° | A common mistake is rushing to the final answer; it is safer to balance the equation before calculating. I recheck units, labels and the wording of the question. One weak result does not define your ability. |
| 27 | ms | `koko` | Brenda P. | `speech` | `#BFDBFE` | 2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk bandingkan trend menggunakan sebab zarah, bukan hafalan arah sahaja. Selepas itu saya cuba satu soalan tanpa melihat nota. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 28 | ms | `academic` | Calvin Q. | `polaroid` | `#FBCFE8` | 0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk hubungkan jenis ikatan dengan struktur dan sifat bahan. Cara ini membantu saya nampak langkah yang tertinggal. |
| 29 | en | `campus_life` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | A common mistake is rushing to the final answer; it is safer to organise the process as a sequence with location and outcome. The result becomes easier to explain to someone else. Keep notes, files and schedules organised so they remain easy to find. |
| 30 | en | `academic` | Carmen R. | `hexagon` | `#FDE68A` | 2.5° | A common mistake is rushing to the final answer; it is safer to make a comparison table for similar terms. I mark the mistake so it does not repeat. |
| 31 | en | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | A common mistake is rushing to the final answer; it is safer to label the diagram from memory and then check it. The working is also easier to review later. |
| 32 | ms | `emotional` | 匿名 | `square` | `#FFF7ED` | -0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk asingkan genotip, fenotip dan kebarangkalian. Saya gunakan satu contoh mudah untuk menguji kefahaman. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 33 | ms | `academic` | Chandra S. | `rect` | `#CFFAFE` | -2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk tunjukkan langkah algebra satu baris pada satu masa. Kaedah ini menjadikan perbincangan lebih teratur. |
| 34 | ms | `academic` | 匿名 | `circle` | `#FEF08A` | 1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk semak skala, purata dan pencilan sebelum membuat kesimpulan. Saya simpan satu contoh lengkap sebagai rujukan. |
| 35 | ms | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk sediakan jadual pemerhatian dan unit sebelum eksperimen bermula. Nota ringkas ini membantu ketika minggu sibuk. |
| 36 | ms | `koko` | 匿名 | `torn` | `#CBD5E1` | -1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk bezakan pemerhatian, inferens dan kesimpulan. Saya semak semula unit, label dan arahan soalan. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 37 | ms | `academic` | Daniel T. | `speech` | `#BFDBFE` | 2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk campurkan soalan transaksi, pelarasan dan penyata. Selepas itu saya cuba satu soalan tanpa melihat nota. |
| 38 | en | `emotional` | Danish U. | `polaroid` | `#FBCFE8` | 0.5° | A common mistake is rushing to the final answer; it is safer to bring full working instead of only the final answer. This makes missing steps easier to notice. One weak result does not define your ability. |
| 39 | ms | `academic` | Devi V. | `ticket` | `#E9D5FF` | -1.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk tetapkan satu hasil yang boleh diukur untuk setiap sesi. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 40 | ms | `academic` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk guna senarai semakan apabila angka tidak seimbang. Saya tandakan kesilapan supaya tidak berulang. |
| 41 | ms | `academic` | Dhia W. | `rounded` | `#BBF7D0` | 1.0° | Dalam sesi kumpulan, cuba lukis rajah vektor dan tetapkan arah positif, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya simpan satu contoh lengkap sebagai rujukan. |
| 42 | ms | `academic` | 匿名 | `square` | `#FFF7ED` | -0.5° | Dalam sesi kumpulan, cuba semak paksi, unit dan kecerunan sebelum mentafsir graf, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Nota ringkas ini membantu ketika minggu sibuk. |
| 43 | en | `academic` | 匿名 | `rect` | `#CFFAFE` | -2.0° | In a study group, try to write units at every calculation step, then ask a friend to check the reason behind each step. I recheck units, labels and the wording of the question. |
| 44 | en | `campus_life` | Ehsan X. | `circle` | `#FEF08A` | 1.5° | In a study group, try to rearrange the formula symbolically before substituting values, then ask a friend to check the reason behind each step. After that, I try one question without looking at notes. Keep notes, files and schedules organised so they remain easy to find. |
| 45 | ms | `emotional` | 匿名 | `envelope` | `#FED7AA` | 0° | Dalam sesi kumpulan, cuba asingkan data diberi, mol dan nisbah persamaan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Cara ini membantu saya nampak langkah yang tertinggal. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 46 | ms | `academic` | Elaine Y. | `torn` | `#CBD5E1` | -1.5° | Dalam sesi kumpulan, cuba seimbangkan persamaan sebelum membuat pengiraan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 47 | ms | `koko` | Elvin Z. | `speech` | `#BFDBFE` | 2.0° | Dalam sesi kumpulan, cuba bandingkan trend menggunakan sebab zarah, bukan hafalan arah sahaja, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya tandakan kesilapan supaya tidak berulang. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 48 | zh | `campus_life` | Farah A. | `polaroid` | `#FBCFE8` | 0.5° | 小组复习时可以把键合类型、结构和物质性质联系起来，再请同学检查每一步的理由。 之后复查过程也会更清楚。 把笔记、文件和时间表整理好，之后更容易找到资料。 |
| 49 | zh | `emotional` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | 小组复习时可以把过程按位置、步骤和结果整理，再请同学检查每一步的理由。 我会用一个简单例子检查理解是否正确。 一次结果不理想不能决定你的能力。 |
| 50 | en | `academic` | Farhan B. | `hexagon` | `#FDE68A` | 2.5° | In a study group, try to make a comparison table for similar terms, then ask a friend to check the reason behind each step. This keeps group discussion more organised. |
| 51 | ms | `academic` | Fatin C. | `rounded` | `#BBF7D0` | 1.0° | Dalam sesi kumpulan, cuba label rajah tanpa melihat nota kemudian semak semula, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya simpan satu contoh lengkap sebagai rujukan. |
| 52 | en | `academic` | Fazli D. | `square` | `#FFF7ED` | -0.5° | In a study group, try to separate genotype, phenotype and probability, then ask a friend to check the reason behind each step. A short note like this helps during busy weeks. |
| 53 | en | `academic` | Ganesh E. | `rect` | `#CFFAFE` | -2.0° | In a study group, try to show algebra one line at a time, then ask a friend to check the reason behind each step. I recheck units, labels and the wording of the question. |
| 54 | ms | `campus_life` | Hafiz F. | `circle` | `#FEF08A` | 1.5° | Dalam sesi kumpulan, cuba semak skala, purata dan pencilan sebelum membuat kesimpulan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Selepas itu saya cuba satu soalan tanpa melihat nota. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 55 | ms | `campus_life` | 匿名 | `envelope` | `#FED7AA` | 0° | Dalam sesi kumpulan, cuba sediakan jadual pemerhatian dan unit sebelum eksperimen bermula, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Cara ini membantu saya nampak langkah yang tertinggal. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 56 | ms | `academic` | Hannah G. | `torn` | `#CBD5E1` | -1.5° | Dalam sesi kumpulan, cuba bezakan pemerhatian, inferens dan kesimpulan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 57 | ms | `academic` | 匿名 | `speech` | `#BFDBFE` | 2.0° | Dalam sesi kumpulan, cuba campurkan soalan transaksi, pelarasan dan penyata, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya tandakan kesilapan supaya tidak berulang. |
| 58 | ms | `academic` | 匿名 | `polaroid` | `#FBCFE8` | 0.5° | Dalam sesi kumpulan, cuba bawa working penuh, bukan hanya jawapan akhir, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Working juga menjadi lebih mudah diperiksa semula. |
| 59 | ms | `academic` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | Dalam sesi kumpulan, cuba tetapkan satu hasil yang boleh diukur untuk setiap sesi, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 60 | zh | `academic` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | 小组复习时可以数字不平衡时使用检查清单，再请同学检查每一步的理由。 这样小组讨论会更有条理。 |
| 61 | zh | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | 快速复习时先先画向量图并确定正方向，把仍不清楚的部分标出来，之后再请教。 接着不看笔记再做一道题。 |
| 62 | en | `campus_life` | 匿名 | `square` | `#FFF7ED` | -0.5° | For a quick review, check the axes, units and gradient before interpreting the graph and mark anything still unclear for the next tutorial. This makes missing steps easier to notice. Keep notes, files and schedules organised so they remain easy to find. |
| 63 | ms | `emotional` | Harith H. | `rect` | `#CFFAFE` | -2.0° | Untuk ulang kaji pantas, tulis unit pada setiap langkah pengiraan dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Hasilnya lebih mudah diterangkan kepada orang lain. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 64 | ms | `academic` | Haziq I. | `circle` | `#FEF08A` | 1.5° | Untuk ulang kaji pantas, susun semula formula secara simbolik sebelum menggantikan nombor dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Saya tandakan kesilapan supaya tidak berulang. |
| 65 | en | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | For a quick review, separate the given data, moles and equation ratio and mark anything still unclear for the next tutorial. The working is also easier to review later. |
| 66 | en | `emotional` | 匿名 | `torn` | `#CBD5E1` | -1.5° | For a quick review, balance the equation before calculating and mark anything still unclear for the next tutorial. I use one simple example to test my understanding. One weak result does not define your ability. |
| 67 | ms | `academic` | 匿名 | `speech` | `#BFDBFE` | 2.0° | Untuk ulang kaji pantas, bandingkan trend menggunakan sebab zarah, bukan hafalan arah sahaja dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Kaedah ini menjadikan perbincangan lebih teratur. |
| 68 | ms | `academic` | Hazwani J. | `polaroid` | `#FBCFE8` | 0.5° | Untuk ulang kaji pantas, hubungkan jenis ikatan dengan struktur dan sifat bahan dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Saya simpan satu contoh lengkap sebagai rujukan. |
| 69 | ms | `campus_life` | Iffah K. | `ticket` | `#E9D5FF` | -1.0° | Untuk ulang kaji pantas, susun proses sebagai urutan dengan lokasi dan hasil dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Nota ringkas ini membantu ketika minggu sibuk. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 70 | ms | `academic` | Ihsan L. | `hexagon` | `#FDE68A` | 2.5° | Untuk ulang kaji pantas, buat jadual perbandingan untuk istilah yang hampir sama dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Saya semak semula unit, label dan arahan soalan. |
| 71 | en | `emotional` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | For a quick review, label the diagram from memory and then check it and mark anything still unclear for the next tutorial. After that, I try one question without looking at notes. One weak result does not define your ability. |
| 72 | en | `academic` | Iman M. | `square` | `#FFF7ED` | -0.5° | For a quick review, separate genotype, phenotype and probability and mark anything still unclear for the next tutorial. This makes missing steps easier to notice. |
| 73 | ms | `academic` | Irfan N. | `rect` | `#CFFAFE` | -2.0° | Untuk ulang kaji pantas, tunjukkan langkah algebra satu baris pada satu masa dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Hasilnya lebih mudah diterangkan kepada orang lain. |

### Akaun（62条）

| # | 语言 | 分类 | 显示作者 | Shape | Color | Rotation | 内容 |
|---:|---|---|---|---|---|---:|---|
| 1 | ms | `emotional` | 匿名 | `circle` | `#FEF08A` | 1.5° | Saya selalu kenal pasti akaun, kategori dan kesan transaksi sebelum mencatat. Working juga menjadi lebih mudah diperiksa semula. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 2 | zh | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | 我通常会理解借贷原因，不只背左右。 我会用一个简单例子检查理解是否正确。 |
| 3 | en | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | I usually use dates, references and narrations consistently. This keeps group discussion more organised. |
| 4 | en | `academic` | Jannah O. | `speech` | `#BFDBFE` | 2.0° | I usually trace posting from journal to final balance. I keep one complete example as a reference. |
| 5 | en | `academic` | Jason P. | `polaroid` | `#FBCFE8` | 0.5° | I usually remember that a balanced trial balance does not prove every entry is correct. A short note like this helps during busy weeks. |
| 6 | ms | `academic` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | Saya selalu tentukan tempoh dan sebab ekonomi sebelum memilih akaun. Saya semak semula unit, label dan arahan soalan. |
| 7 | ms | `academic` | Jia Hui Q. | `hexagon` | `#FDE68A` | 2.5° | Saya selalu gunakan garis masa untuk membezakan dibayar, digunakan dan masih terhutang. Selepas itu saya cuba satu soalan tanpa melihat nota. |
| 8 | ms | `emotional` | Jia Wen R. | `rounded` | `#BBF7D0` | 1.0° | Saya selalu asingkan bahagian semasa dan bahagian masa hadapan. Cara ini membantu saya nampak langkah yang tertinggal. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 9 | zh | `academic` | Joel S. | `square` | `#FFF7ED` | -0.5° | 我通常会明确方法、期间和计提基础。 结果也会更容易向别人解释。 |
| 10 | ms | `academic` | 匿名 | `rect` | `#CFFAFE` | -2.0° | Saya selalu semak kuantiti, kos unit dan kaedah penilaian. Saya tandakan kesilapan supaya tidak berulang. |
| 11 | ms | `academic` | Kavitha T. | `circle` | `#FEF08A` | 1.5° | Saya selalu pastikan angka yang berkaitan konsisten antara penyata. Working juga menjadi lebih mudah diperiksa semula. |
| 12 | en | `academic` | Khai Wen U. | `envelope` | `#FED7AA` | 0° | I usually state the comparison basis before interpreting a ratio. I use one simple example to test my understanding. |
| 13 | ms | `academic` | Khairul V. | `torn` | `#CBD5E1` | -1.5° | Saya selalu label paksi dan arah perubahan sebelum menghuraikan graf. Kaedah ini menjadikan perbincangan lebih teratur. |
| 14 | en | `koko` | 匿名 | `speech` | `#BFDBFE` | 2.0° | I usually separate facts, assumptions, causes and recommendations. I keep one complete example as a reference. In group activities, each member can bring one question or idea. |
| 15 | ms | `campus_life` | 匿名 | `polaroid` | `#FBCFE8` | 0.5° | Saya selalu gunakan satu templat dan lindungi formula penting. Nota ringkas ini membantu ketika minggu sibuk. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 16 | en | `campus_life` | Kiran W. | `ticket` | `#E9D5FF` | -1.0° | I usually classify errors into classification, posting, adjustment and presentation. I recheck units, labels and the wording of the question. Keep notes, files and schedules organised so they remain easy to find. |
| 17 | ms | `campus_life` | Liyana X. | `hexagon` | `#FDE68A` | 2.5° | Saya selalu bawa working penuh, bukan hanya jawapan akhir. Selepas itu saya cuba satu soalan tanpa melihat nota. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 18 | zh | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | 我通常会混合练习交易、调整和报表题。 这样更容易发现遗漏的步骤。 |
| 19 | ms | `academic` | 匿名 | `square` | `#FFF7ED` | -0.5° | Saya selalu guna senarai semakan apabila angka tidak seimbang. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 20 | en | `academic` | 匿名 | `rect` | `#CFFAFE` | -2.0° | I usually do not use real data without permission in demo materials. I mark the mistake so it does not repeat. |
| 21 | ms | `academic` | 匿名 | `circle` | `#FEF08A` | 1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk kenal pasti akaun, kategori dan kesan transaksi sebelum mencatat. Saya simpan satu contoh lengkap sebagai rujukan. |
| 22 | ms | `koko` | Marcus Y. | `envelope` | `#FED7AA` | 0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk fahami sebab debit dan kredit, bukan menghafal arah sahaja. Nota ringkas ini membantu ketika minggu sibuk. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 23 | ms | `campus_life` | 匿名 | `torn` | `#CBD5E1` | -1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk gunakan tarikh, rujukan dan narasi secara konsisten. Saya semak semula unit, label dan arahan soalan. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 24 | en | `academic` | 匿名 | `speech` | `#BFDBFE` | 2.0° | A common mistake is rushing to the final answer; it is safer to trace posting from journal to final balance. After that, I try one question without looking at notes. |
| 25 | ms | `academic` | Maya Z. | `polaroid` | `#FBCFE8` | 0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk ingat bahawa imbangan seimbang belum membuktikan semua catatan betul. Cara ini membantu saya nampak langkah yang tertinggal. |
| 26 | ms | `koko` | Mei Lin A. | `ticket` | `#E9D5FF` | -1.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk tentukan tempoh dan sebab ekonomi sebelum memilih akaun. Hasilnya lebih mudah diterangkan kepada orang lain. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 27 | ms | `academic` | Mei Xin B. | `hexagon` | `#FDE68A` | 2.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk gunakan garis masa untuk membezakan dibayar, digunakan dan masih terhutang. Saya tandakan kesilapan supaya tidak berulang. |
| 28 | ms | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk asingkan bahagian semasa dan bahagian masa hadapan. Working juga menjadi lebih mudah diperiksa semula. |
| 29 | ms | `emotional` | Nabil C. | `square` | `#FFF7ED` | -0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk terangkan kaedah, tempoh dan nilai asas dengan jelas. Saya gunakan satu contoh mudah untuk menguji kefahaman. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 30 | ms | `academic` | Nadia D. | `rect` | `#CFFAFE` | -2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk semak kuantiti, kos unit dan kaedah penilaian. Kaedah ini menjadikan perbincangan lebih teratur. |
| 31 | en | `academic` | Naren E. | `circle` | `#FEF08A` | 1.5° | A common mistake is rushing to the final answer; it is safer to make sure related figures are consistent across statements. I keep one complete example as a reference. |
| 32 | ms | `academic` | Natasha F. | `envelope` | `#FED7AA` | 0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk nyatakan asas perbandingan sebelum mentafsir nisbah. Nota ringkas ini membantu ketika minggu sibuk. |
| 33 | ms | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk label paksi dan arah perubahan sebelum menghuraikan graf. Saya semak semula unit, label dan arahan soalan. |
| 34 | ms | `campus_life` | 匿名 | `speech` | `#BFDBFE` | 2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk asingkan fakta, andaian, punca dan cadangan. Selepas itu saya cuba satu soalan tanpa melihat nota. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 35 | ms | `emotional` | Naufal G. | `polaroid` | `#FBCFE8` | 0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk gunakan satu templat dan lindungi formula penting. Cara ini membantu saya nampak langkah yang tertinggal. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 36 | zh | `campus_life` | Nurin H. | `ticket` | `#E9D5FF` | -1.0° | 常见错误是急着得到最后答案；更稳妥的方法是把错误分为分类、过账、调整和报表格式。 结果也会更容易向别人解释。 把笔记、文件和时间表整理好，之后更容易找到资料。 |
| 37 | en | `koko` | Pavithra I. | `hexagon` | `#FDE68A` | 2.5° | A common mistake is rushing to the final answer; it is safer to bring full working instead of only the final answer. I mark the mistake so it does not repeat. In group activities, each member can bring one question or idea. |
| 38 | ms | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk campurkan soalan transaksi, pelarasan dan penyata. Working juga menjadi lebih mudah diperiksa semula. |
| 39 | ms | `campus_life` | Pravin J. | `square` | `#FFF7ED` | -0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk guna senarai semakan apabila angka tidak seimbang. Saya gunakan satu contoh mudah untuk menguji kefahaman. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 40 | ms | `academic` | 匿名 | `rect` | `#CFFAFE` | -2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk jangan gunakan data sebenar tanpa kebenaran dalam bahan demo. Kaedah ini menjadikan perbincangan lebih teratur. |
| 41 | en | `academic` | 匿名 | `circle` | `#FEF08A` | 1.5° | In a study group, try to identify the accounts, categories and transaction effects before recording, then ask a friend to check the reason behind each step. After that, I try one question without looking at notes. |
| 42 | ms | `academic` | Qaisara K. | `envelope` | `#FED7AA` | 0° | Dalam sesi kumpulan, cuba fahami sebab debit dan kredit, bukan menghafal arah sahaja, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Cara ini membantu saya nampak langkah yang tertinggal. |
| 43 | en | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | In a study group, try to use dates, references and narrations consistently, then ask a friend to check the reason behind each step. The result becomes easier to explain to someone else. |
| 44 | ms | `emotional` | 匿名 | `speech` | `#BFDBFE` | 2.0° | Dalam sesi kumpulan, cuba semak posting dari jurnal hingga baki akhir, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya tandakan kesilapan supaya tidak berulang. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 45 | ms | `emotional` | Rania L. | `polaroid` | `#FBCFE8` | 0.5° | Dalam sesi kumpulan, cuba ingat bahawa imbangan seimbang belum membuktikan semua catatan betul, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Working juga menjadi lebih mudah diperiksa semula. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 46 | zh | `academic` | Rayyan M. | `ticket` | `#E9D5FF` | -1.0° | 小组复习时可以调整分录前先判断期间和经济原因，再请同学检查每一步的理由。 我会用一个简单例子检查理解是否正确。 |
| 47 | zh | `academic` | Ridhwan N. | `hexagon` | `#FDE68A` | 2.5° | 小组复习时可以用时间线区分已支付、已发生和仍欠，再请同学检查每一步的理由。 这样小组讨论会更有条理。 |
| 48 | ms | `academic` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | Dalam sesi kumpulan, cuba asingkan bahagian semasa dan bahagian masa hadapan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya simpan satu contoh lengkap sebagai rujukan. |
| 49 | ms | `academic` | Rina O. | `square` | `#FFF7ED` | -0.5° | Dalam sesi kumpulan, cuba terangkan kaedah, tempoh dan nilai asas dengan jelas, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Nota ringkas ini membantu ketika minggu sibuk. |
| 50 | en | `academic` | 匿名 | `rect` | `#CFFAFE` | -2.0° | In a study group, try to check quantity, unit cost and valuation method, then ask a friend to check the reason behind each step. I recheck units, labels and the wording of the question. |
| 51 | en | `academic` | 匿名 | `circle` | `#FEF08A` | 1.5° | In a study group, try to make sure related figures are consistent across statements, then ask a friend to check the reason behind each step. After that, I try one question without looking at notes. |
| 52 | zh | `academic` | Safiyyah P. | `envelope` | `#FED7AA` | 0° | 小组复习时可以解释比率前先说明比较基础，再请同学检查每一步的理由。 这样更容易发现遗漏的步骤。 |
| 53 | zh | `emotional` | Samuel Q. | `torn` | `#CBD5E1` | -1.5° | 小组复习时可以解释经济图前先标轴和变化方向，再请同学检查每一步的理由。 结果也会更容易向别人解释。 一次结果不理想不能决定你的能力。 |
| 54 | ms | `academic` | Sarah R. | `speech` | `#BFDBFE` | 2.0° | Dalam sesi kumpulan, cuba asingkan fakta, andaian, punca dan cadangan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya tandakan kesilapan supaya tidak berulang. |
| 55 | en | `academic` | Shafiq S. | `polaroid` | `#FBCFE8` | 0.5° | In a study group, try to use one template and protect important formulas, then ask a friend to check the reason behind each step. The working is also easier to review later. |
| 56 | ms | `academic` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | Dalam sesi kumpulan, cuba kelaskan kesilapan kepada klasifikasi, posting, pelarasan dan pembentangan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 57 | en | `academic` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | In a study group, try to bring full working instead of only the final answer, then ask a friend to check the reason behind each step. This keeps group discussion more organised. |
| 58 | ms | `academic` | Sharmila T. | `rounded` | `#BBF7D0` | 1.0° | Dalam sesi kumpulan, cuba campurkan soalan transaksi, pelarasan dan penyata, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya simpan satu contoh lengkap sebagai rujukan. |
| 59 | ms | `academic` | 匿名 | `square` | `#FFF7ED` | -0.5° | Dalam sesi kumpulan, cuba guna senarai semakan apabila angka tidak seimbang, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Nota ringkas ini membantu ketika minggu sibuk. |
| 60 | ms | `campus_life` | Siti Hawa U. | `rect` | `#CFFAFE` | -2.0° | Dalam sesi kumpulan, cuba jangan gunakan data sebenar tanpa kebenaran dalam bahan demo, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya semak semula unit, label dan arahan soalan. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 61 | en | `academic` | Sonia V. | `circle` | `#FEF08A` | 1.5° | For a quick review, identify the accounts, categories and transaction effects before recording and mark anything still unclear for the next tutorial. I mark the mistake so it does not repeat. |
| 62 | ms | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | Untuk ulang kaji pantas, fahami sebab debit dan kredit, bukan menghafal arah sahaja dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Working juga menjadi lebih mudah diperiksa semula. |

### Sains Komputer（65条）

| # | 语言 | 分类 | 显示作者 | Shape | Color | Rotation | 内容 |
|---:|---|---|---|---|---|---:|---|
| 1 | en | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | I usually break the problem into input, process, output and edge cases. This keeps group discussion more organised. |
| 2 | ms | `academic` | Syafiqah W. | `speech` | `#BFDBFE` | 2.0° | Saya selalu tulis langkah yang boleh diuji satu demi satu. Saya simpan satu contoh lengkap sebagai rujukan. |
| 3 | ms | `academic` | 匿名 | `polaroid` | `#FBCFE8` | 0.5° | Saya selalu gunakan nama pemboleh ubah yang menerangkan tujuan. Nota ringkas ini membantu ketika minggu sibuk. |
| 4 | ms | `academic` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | Saya selalu uji syarat benar, palsu dan sempadan. Saya semak semula unit, label dan arahan soalan. |
| 5 | ms | `academic` | Taufiq X. | `hexagon` | `#FDE68A` | 2.5° | Saya selalu jejak nilai setiap ulangan untuk mencari syarat berhenti yang salah. Selepas itu saya cuba satu soalan tanpa melihat nota. |
| 6 | en | `campus_life` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | I usually give each function one clear responsibility. This makes missing steps easier to notice. Keep notes, files and schedules organised so they remain easy to find. |
| 7 | en | `academic` | 匿名 | `square` | `#FFF7ED` | -0.5° | I usually check the first index, last index and empty input. The result becomes easier to explain to someone else. |
| 8 | en | `academic` | Tharani Y. | `rect` | `#CFFAFE` | -2.0° | I usually choose data structures based on required operations. I mark the mistake so it does not repeat. |
| 9 | zh | `koko` | Umairah Z. | `circle` | `#FEF08A` | 1.5° | 我通常会根据输入规模和形式比较算法。 之后复查过程也会更清楚。 小组活动中，每个人都可以带来一个问题或想法。 |
| 10 | zh | `academic` | Vernon A. | `envelope` | `#FED7AA` | 0° | 我通常会一次只改一项并记录结果。 我会用一个简单例子检查理解是否正确。 |
| 11 | ms | `koko` | Wei Han B. | `torn` | `#CBD5E1` | -1.5° | Saya selalu baca mesej ralat pertama yang berkaitan dan semak nombor baris. Kaedah ini menjadikan perbincangan lebih teratur. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 12 | ms | `campus_life` | Wei Jun C. | `speech` | `#BFDBFE` | 2.0° | Saya selalu tetapkan expected output sebelum menjalankan program. Saya simpan satu contoh lengkap sebagai rujukan. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 13 | ms | `academic` | Xin Yi D. | `polaroid` | `#FBCFE8` | 0.5° | Saya selalu uji nilai minimum, maksimum, kosong dan berulang. Nota ringkas ini membantu ketika minggu sibuk. |
| 14 | ms | `academic` | Yasmin E. | `ticket` | `#E9D5FF` | -1.0° | Saya selalu bezakan struktur jadual, kunci dan hubungan sebelum menulis query. Saya semak semula unit, label dan arahan soalan. |
| 15 | ms | `campus_life` | Yong Jie F. | `hexagon` | `#FDE68A` | 2.5° | Saya selalu simpan checkpoint kecil dengan penerangan yang jelas. Selepas itu saya cuba satu soalan tanpa melihat nota. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 16 | ms | `emotional` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | Saya selalu terangkan tujuan, cara menjalankan dan batas projek. Cara ini membantu saya nampak langkah yang tertinggal. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 17 | ms | `academic` | 匿名 | `square` | `#FFF7ED` | -0.5° | Saya selalu tetapkan pemilik fail, interface dan bukti siap. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 18 | en | `koko` | 匿名 | `rect` | `#CFFAFE` | -2.0° | I usually use demo data and avoid real names, passwords or identifiers. I mark the mistake so it does not repeat. In group activities, each member can bring one question or idea. |
| 19 | en | `academic` | Zahin G. | `circle` | `#FEF08A` | 1.5° | I usually test keyboard use, labels and screen sizes before the demo. The working is also easier to review later. |
| 20 | ms | `academic` | Zara H. | `envelope` | `#FED7AA` | 0° | Saya selalu bezakan fungsi siap, prototaip dan rancangan masa depan. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 21 | ms | `campus_life` | 匿名 | `torn` | `#CBD5E1` | -1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk pecahkan masalah kepada input, proses, output dan kes khas. Saya semak semula unit, label dan arahan soalan. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 22 | ms | `campus_life` | 匿名 | `speech` | `#BFDBFE` | 2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk tulis langkah yang boleh diuji satu demi satu. Selepas itu saya cuba satu soalan tanpa melihat nota. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 23 | en | `academic` | Ameer I. | `polaroid` | `#FBCFE8` | 0.5° | A common mistake is rushing to the final answer; it is safer to use variable names that describe purpose. This makes missing steps easier to notice. |
| 24 | zh | `emotional` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | 常见错误是急着得到最后答案；更稳妥的方法是测试真、假和边界条件。 结果也会更容易向别人解释。 一次结果不理想不能决定你的能力。 |
| 25 | ms | `academic` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk jejak nilai setiap ulangan untuk mencari syarat berhenti yang salah. Saya tandakan kesilapan supaya tidak berulang. |
| 26 | en | `koko` | 匿名 | `rounded` | `#BBF7D0` | 1.0° | A common mistake is rushing to the final answer; it is safer to give each function one clear responsibility. The working is also easier to review later. In group activities, each member can bring one question or idea. |
| 27 | en | `academic` | Benedict J. | `square` | `#FFF7ED` | -0.5° | A common mistake is rushing to the final answer; it is safer to check the first index, last index and empty input. I use one simple example to test my understanding. |
| 28 | ms | `academic` | Celine K. | `rect` | `#CFFAFE` | -2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk pilih struktur data berdasarkan operasi yang diperlukan. Kaedah ini menjadikan perbincangan lebih teratur. |
| 29 | ms | `academic` | Darren L. | `circle` | `#FEF08A` | 1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk bandingkan pilihan berdasarkan saiz dan bentuk input. Saya simpan satu contoh lengkap sebagai rujukan. |
| 30 | ms | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk ubah satu perkara pada satu masa dan catat hasilnya. Nota ringkas ini membantu ketika minggu sibuk. |
| 31 | ms | `academic` | Elisha M. | `torn` | `#CBD5E1` | -1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk baca mesej ralat pertama yang berkaitan dan semak nombor baris. Saya semak semula unit, label dan arahan soalan. |
| 32 | ms | `academic` | 匿名 | `speech` | `#BFDBFE` | 2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk tetapkan expected output sebelum menjalankan program. Selepas itu saya cuba satu soalan tanpa melihat nota. |
| 33 | ms | `academic` | Faris N. | `polaroid` | `#FBCFE8` | 0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk uji nilai minimum, maksimum, kosong dan berulang. Cara ini membantu saya nampak langkah yang tertinggal. |
| 34 | ms | `koko` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk bezakan struktur jadual, kunci dan hubungan sebelum menulis query. Hasilnya lebih mudah diterangkan kepada orang lain. Dalam aktiviti berkumpulan, setiap ahli boleh membawa satu soalan atau idea. |
| 35 | en | `academic` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | A common mistake is rushing to the final answer; it is safer to save small checkpoints with clear descriptions. I mark the mistake so it does not repeat. |
| 36 | en | `academic` | Giselle O. | `rounded` | `#BBF7D0` | 1.0° | A common mistake is rushing to the final answer; it is safer to explain purpose, setup and project limitations. The working is also easier to review later. |
| 37 | ms | `academic` | Husna P. | `square` | `#FFF7ED` | -0.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk tetapkan pemilik fail, interface dan bukti siap. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 38 | ms | `academic` | Izzat Q. | `rect` | `#CFFAFE` | -2.0° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk gunakan data demo dan elakkan nama, kata laluan atau nombor sebenar. Kaedah ini menjadikan perbincangan lebih teratur. |
| 39 | ms | `academic` | Janani R. | `circle` | `#FEF08A` | 1.5° | Kesilapan biasa ialah terus mengejar jawapan; lebih selamat untuk uji papan kekunci, label dan saiz skrin sebelum demo. Saya simpan satu contoh lengkap sebagai rujukan. |
| 40 | en | `academic` | Kelvin S. | `envelope` | `#FED7AA` | 0° | A common mistake is rushing to the final answer; it is safer to separate completed features, prototypes and future plans. A short note like this helps during busy weeks. |
| 41 | ms | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | Dalam sesi kumpulan, cuba pecahkan masalah kepada input, proses, output dan kes khas, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Hasilnya lebih mudah diterangkan kepada orang lain. |
| 42 | en | `campus_life` | 匿名 | `speech` | `#BFDBFE` | 2.0° | In a study group, try to write steps that can be tested one at a time, then ask a friend to check the reason behind each step. I mark the mistake so it does not repeat. Keep notes, files and schedules organised so they remain easy to find. |
| 43 | ms | `academic` | 匿名 | `polaroid` | `#FBCFE8` | 0.5° | Dalam sesi kumpulan, cuba gunakan nama pemboleh ubah yang menerangkan tujuan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Working juga menjadi lebih mudah diperiksa semula. |
| 44 | ms | `academic` | Luqman T. | `ticket` | `#E9D5FF` | -1.0° | Dalam sesi kumpulan, cuba uji syarat benar, palsu dan sempadan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 45 | zh | `academic` | Mira U. | `hexagon` | `#FDE68A` | 2.5° | 小组复习时可以逐次追踪循环值以找出错误的停止条件，再请同学检查每一步的理由。 这样小组讨论会更有条理。 |
| 46 | en | `academic` | Naqib V. | `rounded` | `#BBF7D0` | 1.0° | In a study group, try to give each function one clear responsibility, then ask a friend to check the reason behind each step. I keep one complete example as a reference. |
| 47 | en | `emotional` | Omar W. | `square` | `#FFF7ED` | -0.5° | In a study group, try to check the first index, last index and empty input, then ask a friend to check the reason behind each step. A short note like this helps during busy weeks. One weak result does not define your ability. |
| 48 | ms | `academic` | Priya X. | `rect` | `#CFFAFE` | -2.0° | Dalam sesi kumpulan, cuba pilih struktur data berdasarkan operasi yang diperlukan, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya semak semula unit, label dan arahan soalan. |
| 49 | en | `emotional` | Qistina Y. | `circle` | `#FEF08A` | 1.5° | In a study group, try to compare choices based on input size and shape, then ask a friend to check the reason behind each step. After that, I try one question without looking at notes. One weak result does not define your ability. |
| 50 | ms | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | Dalam sesi kumpulan, cuba ubah satu perkara pada satu masa dan catat hasilnya, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Cara ini membantu saya nampak langkah yang tertinggal. |
| 51 | en | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | In a study group, try to read the first relevant error message and check the line number, then ask a friend to check the reason behind each step. The result becomes easier to explain to someone else. |
| 52 | ms | `academic` | Rakesh Z. | `speech` | `#BFDBFE` | 2.0° | Dalam sesi kumpulan, cuba tetapkan expected output sebelum menjalankan program, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya tandakan kesilapan supaya tidak berulang. |
| 53 | zh | `emotional` | 匿名 | `polaroid` | `#FBCFE8` | 0.5° | 小组复习时可以测试最小、最大、空值和重复值，再请同学检查每一步的理由。 之后复查过程也会更清楚。 一次结果不理想不能决定你的能力。 |
| 54 | ms | `academic` | Sangeetha A. | `ticket` | `#E9D5FF` | -1.0° | Dalam sesi kumpulan, cuba bezakan struktur jadual, kunci dan hubungan sebelum menulis query, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 55 | en | `academic` | 匿名 | `hexagon` | `#FDE68A` | 2.5° | In a study group, try to save small checkpoints with clear descriptions, then ask a friend to check the reason behind each step. This keeps group discussion more organised. |
| 56 | ms | `academic` | Tisha B. | `rounded` | `#BBF7D0` | 1.0° | Dalam sesi kumpulan, cuba terangkan tujuan, cara menjalankan dan batas projek, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya simpan satu contoh lengkap sebagai rujukan. |
| 57 | ms | `emotional` | 匿名 | `square` | `#FFF7ED` | -0.5° | Dalam sesi kumpulan, cuba tetapkan pemilik fail, interface dan bukti siap, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Nota ringkas ini membantu ketika minggu sibuk. Satu keputusan yang lemah tidak menentukan kebolehan anda. |
| 58 | ms | `campus_life` | Umar C. | `rect` | `#CFFAFE` | -2.0° | Dalam sesi kumpulan, cuba gunakan data demo dan elakkan nama, kata laluan atau nombor sebenar, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Saya semak semula unit, label dan arahan soalan. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 59 | ms | `academic` | Vaishnavi D. | `circle` | `#FEF08A` | 1.5° | Dalam sesi kumpulan, cuba uji papan kekunci, label dan saiz skrin sebelum demo, kemudian minta rakan menyemak alasan di sebalik setiap langkah. Selepas itu saya cuba satu soalan tanpa melihat nota. |
| 60 | zh | `academic` | 匿名 | `envelope` | `#FED7AA` | 0° | 小组复习时可以区分已完成、原型和未来计划，再请同学检查每一步的理由。 这样更容易发现遗漏的步骤。 |
| 61 | ms | `academic` | 匿名 | `torn` | `#CBD5E1` | -1.5° | Untuk ulang kaji pantas, pecahkan masalah kepada input, proses, output dan kes khas dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Saya gunakan satu contoh mudah untuk menguji kefahaman. |
| 62 | zh | `academic` | 匿名 | `speech` | `#BFDBFE` | 2.0° | 快速复习时先把步骤写成可以逐一测试的伪代码，把仍不清楚的部分标出来，之后再请教。 这样小组讨论会更有条理。 |
| 63 | ms | `campus_life` | Wen Li E. | `polaroid` | `#FBCFE8` | 0.5° | Untuk ulang kaji pantas, gunakan nama pemboleh ubah yang menerangkan tujuan dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Saya simpan satu contoh lengkap sebagai rujukan. Simpan nota, fail dan jadual dengan teratur supaya mudah dicari. |
| 64 | ms | `academic` | 匿名 | `ticket` | `#E9D5FF` | -1.0° | Untuk ulang kaji pantas, uji syarat benar, palsu dan sempadan dan tandakan bahagian yang masih kabur untuk dibawa ke tutorial. Nota ringkas ini membantu ketika minggu sibuk. |
| 65 | zh | `emotional` | Yumna F. | `hexagon` | `#FDE68A` | 2.5° | 快速复习时先逐次追踪循环值以找出错误的停止条件，把仍不清楚的部分标出来，之后再请教。 最后再检查单位、标签和题目要求。 一次结果不理想不能决定你的能力。 |

## 6. 验收、风险与回滚

- 验收：Sains 73、Akaun 62、Sains Komputer 65，总计200。
- 验收：200个稳定key、200条不重复正文、110具名、90匿名。
- 验收：BM 120、English 55、中文25。
- 风险：旧KMK demo seed若未替换而是直接追加，会出现重复或错误总数。
- 停止条件：删除到非demo用户留言、墙映射错误、出现真实个人资料或创建登录账户。
- 回滚：只移除`seedPackageId === 'echowall-kmk-community-v1'`的数据，恢复上一版KMK demo seed。