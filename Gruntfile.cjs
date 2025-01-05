module.exports = function (grunt) {
	// Project configuration
	grunt.initConfig({
		// Read the package.json for project metadata
		pkg: grunt.file.readJSON('package.json'),

		// Uglify configuration for minifying JavaScript files
		uglify: {
			options: {
				compress: {
					drop_console: true, // Remove console statements
				},
				mangle: false, // Do not mangle variable names for readability
				beautify: true, // Beautify the output
				output: {
					comments: function (node, comment) {
						// Preserve comments starting with // ANCHOR
						if (comment.type === "comment1" && comment.value.trim().startsWith("ANCHOR")) {
							return true;
						}
						// Preserve the first comment block (like /*! ... !*/)
						if (comment.type === "comment2" && comment.value.includes("!")) {
							return true;
						}

						return false;
					},
				},
			},
			target: {
				files: [{
					expand: true,            // Enable dynamic expansion
					cwd: "src/",             // Source folder
					src: ["**/*.js", "!**/_/**", "!**/MockUps/**"], // Include all JS files, exclude folders starting with "_"
					dest: "src/minified/",   // Destination folder
					ext: ".min.js",          // Extension for the minified files
					extDot: "last",          // Replace only the last dot in filenames
				}],
			},
		},

		// JSDoc configuration for generating documentation
		jsdoc: {
			dist: {
				src: ['src/easy-docs/**/*.js'], // Source files
				options: {
					destination: 'docs', // Output directory
					template: 'node_modules/tidy-jsdoc', // Use better-docs template
					configure: 'jsdoc.json', // JSDoc configuration file
				},
			},
		},
	});

	// Load the plugins that provide the "uglify" and "jsdoc" tasks
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-jsdoc");

	// Register individual tasks
	grunt.registerTask("minify", ["uglify"]);
	grunt.registerTask("docs", ["jsdoc"]);

	// Register default task that runs both minify and docs
	grunt.registerTask("default", ["uglify", "jsdoc"]);
};
