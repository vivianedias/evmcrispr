import { Box, Center, Text } from '@chakra-ui/react';

import Trail from '../animations/trail';

type CardProps = {
  image: any;
  height?: number;
  name: string;
  info: string;
  description: string;
  showContent?: boolean;
};

const Pixels = () => (
  <>
    <Box
      background="black"
      position="absolute"
      height={2}
      width={2}
      as="span"
    ></Box>
    <Box
      background="black"
      position="absolute"
      height={2}
      width={2}
      as="span"
    ></Box>
    <Box
      background="black"
      position="absolute"
      height={2}
      width={2}
      as="span"
    ></Box>
    <Box
      background="black"
      position="absolute"
      height={2}
      width={2}
      as="span"
    ></Box>
  </>
);

const Card = ({
  image,
  height = 90,
  name,
  info,
  description,
  showContent,
}: CardProps) => {
  return (
    <Box width="255px" position="relative">
      <Box
        minHeight="310px"
        padding={6}
        textAlign="center"
        borderColor="brand.green.300"
        border="4px solid"
        backgroundColor="black"
        zIndex="10"
        position="relative"
      >
        <Pixels />
        <Center
          as={Trail}
          open={showContent}
          overflow="hidden"
          gap={2}
          flexDirection="column"
        >
          <img src={image} alt={name} height={height} />
          <Text
            pt={8}
            fontSize="15px"
            color="brand.green.300"
            fontWeight="bold"
          >
            {name}
          </Text>
          <Text fontSize="15px" fontWeight="bold">
            {info}
          </Text>
          <Text fontSize="13px">{description}</Text>
        </Center>
      </Box>
      <Box
        position="absolute"
        inset="0"
        transform="translate(25px, 25px)"
        border="5px solid"
        color="brand.green.300"
      >
        <Pixels />
      </Box>
    </Box>
  );
};

export default Card;
