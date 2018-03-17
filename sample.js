module.exports = {
  project: 'fplus',
  developmentUrl: 'sivasubramanyam.me',
  developmentProtocol: 'https',
  pages: [
    'https://sivasubramanyam.me',
    'https://sivasubramanyam.me/about',
  ],
  cookies: [
    {
      name: 'isDevTesting',
      value: 'true',
    },
  ],
  devicesToEmulate: ['iPhone X'],
  pageGroups: [
    {
      urls: [
        'https://sivasubramanyam.me',
        'https://sivasubramanyam.me/about',
      ],
      devicesToEmulate: ['iPhone X'],
      cookies: [
        {
          name: 'isDevTesting',
          value: 'true',
        },
      ],
    },
  ],
};
