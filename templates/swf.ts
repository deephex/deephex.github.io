///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
AnalyzerMapperPlugins.register('swf',
	(data:DataView) => {
		var magic = String.fromCharCode(data.getInt8(0), data.getInt8(1), data.getInt8(2));
		if (magic == 'FWS') return 1;
		if (magic == 'CWS') return 1;
		if (magic == 'ZWS') return 1;
		return 0;
	},
	(m:AnalyzerMapper, type:AnalyzerType) => {
		m.str('magic', 3);
		m.u8('version');
		m.u32('length');
		m.chunk('compressed_data', m.available, new AnalyzerType('zlib', ['swf_content']));
	}
);

AnalyzerMapperPlugins.register('swf_content',
	(data:DataView) => {
		return 0.1;
	},
	(m:AnalyzerMapper, type:AnalyzerType) => {
		var nbits = m.bits('nbits', 5);
		m.bits('xmin', nbits);
		m.bits('xmax', nbits);
		m.bits('ymin', nbits);
		m.bits('ymax', nbits);
	}
);