const multer = require("multer");

/*
    Guardamos las imágenes en memoria.
    No escribimos archivos en disco porque las vamos a reenviar
    directamente a NVIDIA NIM.
*/
const storage = multer.memoryStorage();

/*
    Solo aceptamos imágenes.
*/
const fileFilter = (req, file, cb) => {

    if (file.mimetype.startsWith("image/")) {
        return cb(null, true);
    }

    cb(new Error("Solo se permiten archivos de imagen."), false);

};

const upload = multer({

    storage,

    fileFilter,

    limits: {

        /*
            Hasta 10 imágenes
        */
        files: 10,

        /*
            20 MB por imagen
        */
        fileSize: 20 * 1024 * 1024

    }

});

module.exports = upload;
