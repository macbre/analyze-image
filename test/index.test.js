import { describe, it } from "@jest/globals";

import analyzeImage, { EXIT_IMAGE_PASSED_IS_INVALID, EXIT_EMPTY_IMAGE } from '../lib/index.js';
import { strictEqual, ok } from 'assert';
import { promises as fs } from 'fs';
import { resolve } from 'path';


describe('Image parameter', () => {
    describe('Wrong image parameter', () => {
        it('should fail loading anything else than string or buffer', async () => {
            try {
                await analyzeImage(42);
            } catch(error) {
                strictEqual(error.code, EXIT_IMAGE_PASSED_IS_INVALID, 'Error code 253 is returned');
            }

            try {
                await analyzeImage(true);
            } catch(error) {
                strictEqual(error.code, EXIT_IMAGE_PASSED_IS_INVALID, 'Error code 253 is returned');
            }

            try {
                await analyzeImage({});
            } catch(error) {
                strictEqual(error.code, EXIT_IMAGE_PASSED_IS_INVALID, 'Error code 253 is returned');
            }

            try {
                await analyzeImage(undefined);
            } catch(error) {
                strictEqual(error.code, EXIT_IMAGE_PASSED_IS_INVALID, 'Error code 253 is returned');
            }
        });

        it('should fail loading improper format in a Promise way', async () => {
            analyzeImage(42).catch(function(error) {
                strictEqual(error.code, EXIT_IMAGE_PASSED_IS_INVALID, 'Error code 253 is returned');
            });
        });
    });

    describe('Empty image', () => {
        it('should fail loading an empty string', async () => {
            try {
                await analyzeImage('');
            } catch(error) {
                strictEqual(error.code, EXIT_EMPTY_IMAGE, 'Error code 252 is returned');
            }
        });

        it('should fail loading an empty buffer', async () => {
            try {
                await analyzeImage(Buffer.from([]));
            } catch(error) {
                strictEqual(error.code, EXIT_EMPTY_IMAGE, 'Error code 252 is returned');
            }
        });
    });

    describe('Image as a string', () => {
        it('should load an SVG image', async () => {
            const image = await fs.readFile(resolve(__dirname, './images/svg-image.svg'));
            const res = await analyzeImage(image.toString());
            strictEqual(res.stats.mimeType, 'image/svg+xml', 'Mime type is correct');
            strictEqual(res.stats.format, 'svg', 'Format is correct');
        });

        it('should load a base64 encoded JPEG image', async () => {
            const image = await fs.readFile(resolve(__dirname, './images/jpeg-image.jpg'), {encoding: 'base64'});
            const res = await analyzeImage(image);
            strictEqual(res.stats.mimeType, 'image/jpeg', 'Mime type is correct');
            strictEqual(res.stats.format, 'jpg', 'Format is correct');
        });
    });

    describe('Image as a buffer', () => {
        it('should load a PNG image', async () => {
            const image = await fs.readFile(resolve(__dirname, './images/png-image.png'));
            const res = await analyzeImage(image);
            strictEqual(res.stats.mimeType, 'image/png', 'Mime type is correct');
            strictEqual(res.stats.format, 'png', 'Format is correct');
        });

        it('should load an SVG inside a buffer', async () => {
            const image = await fs.readFile(resolve(__dirname, './images/svg-image.svg'));
            const buffer = Buffer.from(image, 'base64');
            const res = await analyzeImage(buffer);
            strictEqual(res.stats.mimeType, 'image/svg+xml', 'Mime type is correct');
            strictEqual(res.stats.format, 'svg', 'Format is correct');
        });
    });

    describe('Output format', () => {
        it('should be respected', async () => {
            const image = await fs.readFile(resolve(__dirname, './images/jpeg-image.jpg'));
            const res = await analyzeImage(image, {
                displayWidth: 200,
                displayHeight: 100,
                viewportWidth: 1200,
                viewportHeight: 800,
                html: '<picture><source media="(max-width: 600px)" srcset="image3.jpg 30w" sizes="100vw" /><img srcset="image1.jpg 10w,image2.jpg 20w" sizes="5vw" /></picture>'
            }, {removeBuffersFromTransforms: false});
            
            // Stats
            strictEqual(res.stats.format, 'jpg');
            strictEqual(res.stats.mimeType, 'image/jpeg');
            strictEqual(res.stats.fileSize, image.length);
            strictEqual(res.stats.width, 285);
            strictEqual(res.stats.height, 427);
            strictEqual(res.stats.animated, false);
            strictEqual(res.stats.sizesAttribute, '5vw');
            strictEqual(res.stats.srcsetAttribute, 'image1.jpg 10w, image2.jpg 20w');
            strictEqual(res.stats.displayDensity.toFixed(4), '2.8475');
            strictEqual(res.stats.displayRatio.toFixed(4), '2.8475');

            // Transforms
            strictEqual(res.transforms.optimized.fileSize, image.length);
            ok(res.transforms.optimized.newFileSize < image.length);
            strictEqual(Buffer.isBuffer(res.transforms.optimized.body), true);
            strictEqual(res.transforms.optimized.body.length, res.transforms.optimized.newFileSize);

            strictEqual(res.transforms.resized.fileSize, res.transforms.optimized.newFileSize);
            ok(res.transforms.resized.newFileSize < res.transforms.optimized.newFileSize);
            strictEqual(res.transforms.resized.naturalWidth, 285);
            strictEqual(res.transforms.resized.naturalHeight, 427);
            strictEqual(res.transforms.resized.newWidth, 200);
            strictEqual(res.transforms.resized.newHeight, 100);
            strictEqual(Buffer.isBuffer(res.transforms.resized.body), true);
            strictEqual(res.transforms.resized.body.length, res.transforms.resized.newFileSize);

            strictEqual(res.transforms.webpEncoded.fileSize, image.length);
            ok(res.transforms.webpEncoded.newFileSize < image.length);
            strictEqual(Buffer.isBuffer(res.transforms.webpEncoded.body), true);
            strictEqual(res.transforms.webpEncoded.body.length, res.transforms.webpEncoded.newFileSize);

            strictEqual(res.transforms.avifEncoded.fileSize, image.length);
            ok(res.transforms.avifEncoded.newFileSize < image.length);
            strictEqual(Buffer.isBuffer(res.transforms.avifEncoded.body), true);
            strictEqual(res.transforms.avifEncoded.body.length, res.transforms.avifEncoded.newFileSize);

            // Offenders
            strictEqual(res.offenders.imageNotOptimized.fileSize, image.length);
            ok(res.offenders.imageNotOptimized.newFileSize < image.length);

            strictEqual(res.offenders.imageScaledDown.fileSize, res.transforms.optimized.newFileSize);
            ok(res.offenders.imageScaledDown.newFileSize < res.transforms.optimized.newFileSize);
            strictEqual(res.offenders.imageScaledDown.naturalWidth, 285);
            strictEqual(res.offenders.imageScaledDown.naturalHeight, 427);
            strictEqual(res.offenders.imageScaledDown.newWidth, 200);
            strictEqual(res.offenders.imageScaledDown.newHeight, 100);

            strictEqual(res.offenders.imageOldFormat.fileSize, image.length);
            ok(res.offenders.imageOldFormat.newFileSize > 0);
            ok(res.offenders.imageOldFormat.webpSize > 0);
            ok(res.offenders.imageOldFormat.avifSize > 0);

            strictEqual(res.offenders.imageWithIncorrectSizesParam.sizesAttribute, '5vw');
            strictEqual(res.offenders.imageWithIncorrectSizesParam.convertedInPx, 60);
            strictEqual(res.offenders.imageWithIncorrectSizesParam.displayWidth, 200);

            ok(!res.offenders.imageExcessiveDensity);
        });
    });
});
