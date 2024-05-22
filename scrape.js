async function getImages() {
    let pictures = document.querySelectorAll('picture')
    for (picture of pictures) {
        let source = picture.childNodes[1].srcset;
        let secondSlash = source.lastIndexOf('/');
        let firstSlash = source.slice(0, secondSlash).lastIndexOf('/');
        let newSource = source.slice(0, firstSlash) + '/2000/' + source.slice(secondSlash + 1)
        window.open(newSource);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("opened " + newSource);

    }
}