(function initializePustakaSpotlightScene() {
  "use strict";

  const MAIN_PHOTO = "../../vid%20note%20buildings/6077934093636145760.jpg";
  const MAIN_POST_COLOR = "#BFDBFE";
  const GLOW_LAPS = 3;
  const NORMAL_HOLD_MS = 650;
  const FINAL_PULSE_MS = 3700;
  const FINAL_FRAME_MS = 4250;

  const categoryDetails = Object.freeze({
    academic: { icon: "📚", label: "Academic" },
    campus_life: { icon: "🏫", label: "Campus life" },
    emotional: { icon: "💛", label: "Support" },
    koko: { icon: "🎖️", label: "Activities" },
  });

  const mainPost = Object.freeze({
    id: "la-library-spotlight",
    isOwnPost: true,
    author: "LA",
    postType: "discussion",
    category: "academic",
    shape: "rounded",
    color: MAIN_POST_COLOR,
    rotation: 0,
    score: 0,
    content: "Library is here!!!",
    image: MAIN_PHOTO,
    imageAlt: "A gathering inside Pustaka at Kolej Matrikulasi Kedah",
  });

  // Frozen visual snapshot of the current Pustaka Hot ordering. The real
  // Building Wall and its seed/user data are never loaded or modified here.
  const hotPosts = Object.freeze([
    { score: 87, color: "#BFDBFE", shape: "circle", category: "campus_life", author: "Isaac N.", content: "Use the group zone for discussion and move to the silent area for individual work. Mixing both usually frustrates everyone." },
    { score: 85, color: "#FEF08A", shape: "circle", category: "campus_life", author: "Zara H.", content: "Pastikan kerusi dikembalikan ke tempat asal dan sampah dibawa keluar. Ruang yang kemas memudahkan pengguna selepas kita." },
    { score: 81, color: "#FED7AA", shape: "torn", category: "academic", author: "Anonymous", content: "Group discussion is more effective when one person keeps time and another records unanswered questions for later consultation." },
    { score: 74, color: "#BBF7D0", shape: "speech", category: "campus_life", author: "Anonymous", content: "Jangan tinggalkan buku dan alat tulis untuk 'menempah' meja terlalu lama. Beri peluang kepada orang lain menggunakan ruang belajar." },
    { score: 73, color: "#BFDBFE", shape: "rounded", category: "academic", author: "Dhia F.", content: "Saya guna teknik 45 minit belajar dan 10 minit rehat. Lebih mudah kekal fokus berbanding duduk terlalu lama tanpa sasaran." },
    { score: 72, color: "#CBD5E1", shape: "circle", category: "academic", author: "Viknesh K.", content: "Saya tulis rujukan penuh terus semasa membaca. Menangguhkan citation sampai akhir biasanya menyebabkan sumber hilang." },
    { score: 67, color: "#FFF7ED", shape: "polaroid", category: "campus_life", author: "Hannah Y.", content: "A quick photo of the current notice board is useful, but avoid capturing other students or personal information." },
    { score: 64, color: "#BFDBFE", shape: "rounded", category: "campus_life", author: "Nabila K.", content: "Sebelum masuk, semak notis terkini di pintu. Waktu operasi boleh berubah, terutama menjelang minggu peperiksaan atau cuti kolej." },
    { score: 60, color: "#E9D5FF", shape: "square", category: "academic", author: "Anonymous", content: "Kalau perbincangan mula lari topik, kembali kepada senarai soalan. Satu sesi yang pendek tetapi fokus lebih berguna." },
    { score: 58, color: "#BBF7D0", shape: "polaroid", category: "academic", author: "Luqman T.", content: "Cari nombor panggilan buku sebelum berjalan di antara rak. Catat tajuk dan lokasi supaya tidak perlu mengulang carian." },
    { score: 55, color: "#FDE68A", shape: "rect", category: "academic", author: "Anonymous", content: "End every group session with a short summary: what is understood, what is uncertain, and who will verify each point." },
    { score: 53, color: "#BFDBFE", shape: "square", category: "campus_life", author: "Daniela P.", content: "需要接电话时请到学习区外面。即使说话声音不大，在安静空间里也会影响附近的人。" },
    { score: 46, color: "#FEF08A", shape: "ticket", category: "campus_life", author: "Anonymous", content: "Beg biasanya perlu diletakkan di rak luar. Bawa telefon, dompet dan barang berharga bersama; jangan tinggalkan dalam beg tanpa pengawasan." },
    { score: 43, color: "#BBF7D0", shape: "envelope", category: "academic", author: "Syamil J.", content: "Menjelang peperiksaan, datang dengan rancangan alternatif. Jika tempat pilihan penuh, terus gunakan zon lain tanpa membuang masa menunggu." },
    { score: 37, color: "#FBCFE8", shape: "envelope", category: "campus_life", author: "Anonymous", content: "进入图书馆前先把电脑、充电器和笔记拿好，贵重物品不要留在外面的书包里。" },
    { score: 33, color: "#FED7AA", shape: "rect", category: "campus_life", author: "Rayyan S.", content: "Kalau datang berkumpulan, tentukan tempat berjumpa terlebih dahulu. Kawasan pintu masuk mudah sesak apabila ramai orang keluar serentak." },
    { score: 32, color: "#CFFAFE", shape: "speech", category: "academic", author: "Anonymous", content: "Gunakan masa terakhir untuk menyemak kesilapan sendiri, bukan membuka terlalu banyak topik baharu. Meja perpustakaan mudah jadi penuh dengan nota yang tidak digunakan." },
    { score: 31, color: "#FFF7ED", shape: "ticket", category: "academic", author: "Haziqah P.", content: "Jangan ambil terlalu banyak buku serentak. Pilih satu buku utama dan satu rujukan tambahan supaya tidak membazir masa." },
    { score: 28, color: "#E9D5FF", shape: "hexagon", category: "academic", author: "Anonymous", content: "Selepas guna buku, ikut arahan perpustakaan untuk pemulangan atau susunan semula. Jangan letak secara rawak di rak lain." },
    { score: 25, color: "#CBD5E1", shape: "rect", category: "academic", author: "Anonymous", content: "Tempat yang paling selesa belum tentu tempat paling produktif. Pilih meja yang kurang lalu-lalang jika mudah hilang fokus." },
    { score: 24, color: "#BFDBFE", shape: "ticket", category: "emotional", author: "Sophie K.", content: "If you cannot focus, take a short walk outside and return with one specific task. Staying seated while panicking rarely helps." },
    { score: 23, color: "#FEF08A", shape: "polaroid", category: "academic", author: "Megan J.", content: "Bring headphones only for offline audio or noise reduction. Keep the volume low enough that it cannot be heard by nearby students." },
    { score: 23, color: "#CBD5E1", shape: "torn", category: "campus_life", author: "Anonymous", content: "Kalau rak beg penuh, susun beg dengan kemas dan jangan menutup laluan. Ambil gambar lokasi rak supaya senang dicari semula." },
    { score: 20, color: "#E9D5FF", shape: "speech", category: "campus_life", author: "Afiq H.", content: "Simpan kad matrik di tempat yang mudah dicapai. Jangan letak bersama barang yang sukar diambil semula dari rak beg." },
    { score: 18, color: "#FBCFE8", shape: "hexagon", category: "campus_life", author: "Anonymous", content: "The nearby café can be convenient for a short break, but menus, prices and operating hours may change. Check the current stall notice." },
    { score: 15, color: "#CBD5E1", shape: "envelope", category: "emotional", author: "Adam E.", content: "Belajar dengan kawan membantu saya sedar bahawa ramai orang juga keliru. Rasa kurang tertekan apabila masalah dibincang bersama." },
    { score: 14, color: "#FDE68A", shape: "square", category: "academic", author: "Anonymous", content: "A useful reading method is to write one question before each section. It stops me from highlighting entire pages without thinking." },
    { score: 13, color: "#FED7AA", shape: "speech", category: "academic", author: "Anonymous", content: "Compare two textbooks when one explanation feels too abstract. Different diagrams often make the same concept much clearer." },
    { score: 12, color: "#FFF7ED", shape: "rounded", category: "academic", author: "Yasmin B.", content: "Kami bahagikan meja kepada tiga bahagian: nota, soalan, dan kesilapan biasa. Cara ini buat perbincangan lebih teratur." },
    { score: 12, color: "#CFFAFE", shape: "square", category: "academic", author: "Anonymous", content: "安静区适合做需要专注的题目，但记得把手机调成静音，不要一直震动影响别人。" },
    { score: 11, color: "#BBF7D0", shape: "square", category: "campus_life", author: "Olivia M.", content: "Take only the materials you need before entering. Going back repeatedly to the bag rack breaks your study flow." },
    { score: 11, color: "#CBD5E1", shape: "rounded", category: "academic", author: "Faris Y.", content: "Sebelum pulang, ambil lima minit untuk susun bahan esok. Permulaan sesi berikutnya akan jadi lebih cepat dan kurang kelam-kabut." },
    { score: 9, color: "#FBCFE8", shape: "ticket", category: "academic", author: "Harith Z.", content: "Untuk belajar berkumpulan, setiap orang perlu bawa satu topik untuk diterangkan. Jangan datang hanya untuk menyalin jawapan kawan." },
    { score: 9, color: "#FFF7ED", shape: "polaroid", category: "emotional", author: "Alyaana R.", content: "Saya pernah duduk lama tetapi tidak banyak belajar kerana terlalu risau. Sekarang saya mula dengan lima soalan mudah untuk bina momentum." },
    { score: 7, color: "#CFFAFE", shape: "hexagon", category: "academic", author: "Noah P.", content: "The silent zone works best when you prepare one clear task before sitting down. I usually write a two-hour checklist first." },
    { score: 5, color: "#FED7AA", shape: "rect", category: "academic", author: "Anonymous", content: "During busy weeks, arrive with downloaded notes and a charged device. Do not depend entirely on Wi-Fi or a nearby power point." },
    { score: 4, color: "#FDE68A", shape: "circle", category: "academic", author: "Anonymous", content: "Zon senyap sangat sesuai untuk latihan pengiraan. Letakkan telefon dalam mod senyap supaya tidak terganggu setiap beberapa minit." },
    { score: 3, color: "#CFFAFE", shape: "torn", category: "academic", author: "Anonymous", content: "找不到资料时先记下书名、作者和关键词，再去询问，比只说“我要那本蓝色的书”清楚很多。" },
    { score: 3, color: "#BFDBFE", shape: "rounded", category: "academic", author: "Ethan C.", content: "Photograph only the pages you are allowed to use, and record the book title so you can cite the source later." },
    { score: 2, color: "#E9D5FF", shape: "torn", category: "academic", author: "Anonymous", content: "Bawa air secukupnya mengikut peraturan semasa, tetapi elakkan makanan yang boleh mengotorkan meja atau menarik serangga." },
    { score: 0, color: "#CFFAFE", shape: "hexagon", category: "academic", author: "Anonymous", content: "小组讨论前先分配题目，每个人讲一个部分，比大家一起看同一页更有效率。" },
    { score: 0, color: "#E9D5FF", shape: "envelope", category: "emotional", author: "Aarav D.", content: "Bila ulang kaji terasa terlalu berat, pilih satu bab kecil dan siapkan dahulu. Satu tugas yang selesai lebih baik daripada rancangan yang sempurna." },
  ]);

  const fixedRotations = Object.freeze([0, -1.5, 1.2, -.8, 1.5, -1.1, .7, -1.8, 1.1, -.5, 1.7, -.9]);

  function createNoteElement(note, index) {
    const category = categoryDetails[note.category] || categoryDetails.academic;
    const article = document.createElement("article");
    article.className = `note-item shape-${note.shape} cat-${note.category}${note.image ? " has-photo" : ""}${note.isOwnPost ? " is-own-post" : ""}`;
    article.dataset.postId = note.id || `pustaka-hot-${index}`;
    article.dataset.postType = note.postType || "discussion";
    article.dataset.category = note.category;
    article.dataset.shape = note.shape;
    article.dataset.author = note.author;
    article.dataset.score = String(note.score);
    article.style.setProperty("--note-color", note.color);
    article.style.setProperty("--note-rotation", `${note.rotation ?? fixedRotations[index % fixedRotations.length]}deg`);
    article.style.setProperty("--note-delay", `${Math.min(index * 14, 154)}ms`);
    article.setAttribute("role", "article");
    article.setAttribute("aria-label", `${note.postType || "Discussion"} post by ${note.author}: ${note.content}`);

    const pin = document.createElement("div");
    pin.className = "note-pin";
    pin.setAttribute("aria-hidden", "true");

    const categoryLabel = document.createElement("div");
    categoryLabel.className = "note-category-label";
    categoryLabel.textContent = `${category.icon} ${category.label}`;

    const content = document.createElement("div");
    content.className = "note-content";
    content.textContent = note.content;

    const footer = document.createElement("div");
    footer.className = "note-footer";

    const author = document.createElement("span");
    author.className = "note-author";
    author.textContent = `👤 ${note.author}`;

    const votes = document.createElement("span");
    votes.className = "note-votes";
    votes.setAttribute("aria-label", `${note.score} likes`);
    votes.textContent = `👍 ${note.score}`;

    footer.append(author, votes);
    article.append(pin, categoryLabel);

    if (note.image) {
      const photo = document.createElement("div");
      photo.className = "note-photo";
      const image = document.createElement("img");
      image.src = note.image;
      image.alt = note.imageAlt;
      image.loading = "eager";
      image.decoding = "sync";
      photo.append(image);
      article.append(photo);
    }

    article.append(content, footer);
    return article;
  }

  function renderWall() {
    const canvas = document.getElementById("wall-canvas");
    const orderedPosts = [mainPost, ...hotPosts];
    const fragment = document.createDocumentFragment();
    orderedPosts.forEach((post, index) => fragment.append(createNoteElement(post, index)));
    canvas.replaceChildren(fragment);
  }

  function removeDuplicateIds(root) {
    if (root.id) root.removeAttribute("id");
    root.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
  }

  function positionFocusPortal() {
    const hero = document.querySelector('[data-post-id="la-library-spotlight"]');
    const portal = document.getElementById("focus-portal");
    if (!hero || !portal) return false;
    const rect = hero.getBoundingClientRect();
    portal.style.left = `${rect.left}px`;
    portal.style.top = `${rect.top}px`;
    portal.style.width = `${rect.width}px`;
    portal.style.height = `${rect.height}px`;
    return rect.width > 0 && rect.height > 0;
  }

  function prepareFocusPortal() {
    const hero = document.querySelector('[data-post-id="la-library-spotlight"]');
    const mount = document.getElementById("focus-card-mount");
    if (!hero || !mount || !positionFocusPortal()) return false;
    const clone = hero.cloneNode(true);
    removeDuplicateIds(clone);
    clone.classList.remove("is-portalized");
    clone.classList.add("spotlight-clone");
    clone.setAttribute("aria-hidden", "true");
    mount.replaceChildren(clone);
    return true;
  }

  function enterFinalFrame() {
    document.body.classList.add("is-settled");
    document.body.classList.remove("is-finishing", "is-settling");
    window.__PUSTAKA_SPOTLIGHT_QA__.animationStopped = true;
    window.__PUSTAKA_SPOTLIGHT_QA__.state = "final-editing-frame";
  }

  function beginSpotlight() {
    if (!prepareFocusPortal()) return;
    const hero = document.querySelector('[data-post-id="la-library-spotlight"]');
    hero.classList.add("is-portalized");
    document.body.classList.add("is-spotlighting");
    window.__PUSTAKA_SPOTLIGHT_QA__.state = "spotlight";

    window.setTimeout(() => {
      document.body.classList.add("is-finishing", "is-settling");
      window.__PUSTAKA_SPOTLIGHT_QA__.state = "final-pulse";
    }, FINAL_PULSE_MS - NORMAL_HOLD_MS);

    window.setTimeout(enterFinalFrame, FINAL_FRAME_MS - NORMAL_HOLD_MS);
  }

  function startSequence() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.__PUSTAKA_SPOTLIGHT_QA__ = {
      standalone: true,
      productionDataConnected: false,
      expectedNoteCount: 43,
      actualNoteCount: document.querySelectorAll(".note-item").length,
      mainPostFirst: document.querySelector(".note-item")?.dataset.postId === "la-library-spotlight",
      mainPost: {
        content: mainPost.content,
        author: mainPost.author,
        postType: mainPost.postType,
        category: mainPost.category,
        shape: mainPost.shape,
        color: mainPost.color,
        photo: "6077934093636145760.jpg",
      },
      glowLaps: GLOW_LAPS,
      normalHoldMs: NORMAL_HOLD_MS,
      finalFrameMs: FINAL_FRAME_MS,
      animationStopped: reducedMotion,
      state: reducedMotion ? "reduced-motion-final-frame" : "normal-wall",
    };

    if (reducedMotion) {
      prepareFocusPortal();
      document.querySelector('[data-post-id="la-library-spotlight"]')?.classList.add("is-portalized");
      document.body.classList.add("is-reduced-motion", "is-spotlighting", "is-settled");
      return;
    }

    window.setTimeout(beginSpotlight, NORMAL_HOLD_MS);
  }

  renderWall();

  window.addEventListener("resize", () => {
    if (!document.body.classList.contains("is-spotlighting")) positionFocusPortal();
  }, { passive: true });

  requestAnimationFrame(() => requestAnimationFrame(startSequence));
}());
