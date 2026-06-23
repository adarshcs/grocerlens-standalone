const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withClerkIosFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let podfile = fs.readFileSync(podfilePath, 'utf-8');
      if (podfile.includes('# withClerkIosFix')) return config;
      podfile = podfile.replace(
        /([ \t]*)(react_native_post_install\(installer[^)]*\))/,
        [
          '$1# withClerkIosFix: rescue Clerk SPM nil-target crash (pnpm + RN 0.81.x)',
          '$1begin',
          '$1  $2',
          '$1rescue => e',
          '$1  raise e unless e.message.include?("package_product_dependencies")',
          '$1  Pod::UI.warn "[withClerkIosFix] Suppressed Clerk SPM nil-target error (safe): #{e.message}"',
          '$1end',
        ].join('\n')
      );
      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withClerkIosFix;