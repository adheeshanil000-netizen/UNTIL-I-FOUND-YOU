// Element
const beginBtn = document.getElementById("beginBtn");
const intro = document.getElementById("intro");
const website = document.getElementById("website");
const music = document.getElementById("bgMusic");

// Hide website at first
website.style.display = "none";

// Begin button
beginBtn.addEventListener("click", () => {

    // Hide intro
    intro.style.opacity = "0";

    setTimeout(() => {

        intro.style.display = "none";

        website.style.display = "block";

        // Start music
        music.play().catch(() => {
            console.log("Music will start after user interaction.");
        });

        // Smooth scroll to top
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    },800);

});



// Reveal Animation

const reveals = document.querySelectorAll(
".memory,.gallery,.letter,.video,.ending,.hero"
);

function revealOnScroll(){

    reveals.forEach((item)=>{

        const top=item.getBoundingClientRect().top;

        const visible=window.innerHeight-120;

        if(top<visible){

            item.style.opacity="1";
            item.style.transform="translateY(0px)";

        }

    });

}

reveals.forEach((item)=>{

    item.style.opacity="0";
    item.style.transform="translateY(80px)";
    item.style.transition="1.2s ease";

});

window.addEventListener("scroll",revealOnScroll);

revealOnScroll();
