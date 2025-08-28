import openMouth from "../../assets/pacman-chihuahua-open.png";
import closedMouth from "../../assets/pacman-chihuahua-avatar.png";

export function loadImage(src) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.src = src;
        img.onload = () => res(img);
        img.onerror = rej;
    });
}

export async function loadSprites() {
    const [open, closed] = await Promise.all([
        loadImage(openMouth),
        loadImage(closedMouth),
    ]);
    return { open, closed };
}
