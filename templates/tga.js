AnalyzerMapperPlugins.register(
    'tga',
    function (data, filename) {
        if (filename.match(/\.tga$/i)) return 1;
        return 0.1;
    },
    async(function*(m, type) {
        //yield m.u8('magic');
        yield m.u8('id_length');
        yield m.u8('color_map_type', EnumRepresenter({
            0: 'no_color_map',
            1: 'present'
        }));
        yield m.u8('image_type', EnumRepresenter({
            0: 'no_image_data',
            1: 'uncompressed_palette',
            2: 'uncompressed_rgba',
            3: 'uncompressed_gray',
            9: 'rle_palette',
            10: 'rle_rgba',
            11: 'rle_gray'
        }));
        yield(m.struct('color_map', async(function*() {
            yield m.u16('entry_index');
            yield m.u16('map_length');
            yield m.u8('bits_per_pixel');
        })));

        yield(m.struct('image_spec', async(function*() {
            yield m.u16('x_origin');
            yield m.u16('y_origin');
            yield m.u16('width');
            yield m.u16('height');
            yield m.u8('pixel_depth');
            yield m.u8('image_descriptor');
        })));
    })
);
