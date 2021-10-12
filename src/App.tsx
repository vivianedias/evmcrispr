import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';

import "ace-builds/src-noconflict/mode-jade";
import "ace-builds/src-noconflict/theme-vibrant_ink";

import { ethers } from 'ethers';
// import { JsonRpcSigner } from '@ethersproject/providers';
import { evmcl, EVMcrispr } from "@commonsswarm/evmcrispr";

declare global {
  interface Window {
      ethereum:any;
  }
}

function client(chainId: number) {
  return ({
    4: "rinkeby.client.aragon.org",
    100: "aragon.1hive.org"
  })[chainId];
}

function App() {
  const [provider, setProvider] = useState(new ethers.providers.Web3Provider(window.ethereum));
  const [address, setAddress] = useState("");
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(
`# Available commands:

connect <dao> <...path>
install <repo> [...initParams]
grant <entity> <app> <role> [permissionManager]
revoke <entity> <app> <role>
exec <app> <methodName> [...params]
act <agent> <targetAddr> <methodSignature> [...params]

# Example (unwrap WETH):

connect 1hive token-manager voting
install agent:new-agent
grant voting agent:new-agent TRANSFER_ROLE voting
exec vault transfer -token:WETH agent:new-agent 100e18
act agent:new-agent 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d withdraw(uint256) 100e18
exec agent:new-agent transfer -token:ETH vault 100e18
`);
  useEffect(() => {
    provider.getSigner().getAddress().then(setAddress);
  }, [provider]);
  const addressShortened = `${address.substr(0,4)}..${address.substr(-4)}`;
  async function onForward() {
    setError('');
    setLoading(true);
    try{
      const [ , dao, _path ] = code.split('\n')[0].match(/^connect ([\w.-]+)(( [\w.-:]+)*)$/) ?? [];
      if (!dao || !_path) {
        throw new Error("First line must be `connect <dao> <...path>`");
      }
      if (!/0x[0-9A-Fa-f]+/.test(dao)) {
        throw new Error("ENS not supported yet, please introduce the address of the DAO.");
      }
      const path = _path.trim().split(' ').map(id => id.trim());
      const _code = code.split("\n").slice(1).join("\n");
      const evmcrispr = await EVMcrispr.create(dao, provider.getSigner());
      await evmcrispr.forward(
        evmcl`${_code}`,
        path
      );
      const chainId = (await provider.getNetwork()).chainId;
      const lastApp = evmcrispr.app(path.slice(-1)[0]);
      window.location.href = `https://${client(chainId)}/#/${dao}/${lastApp}`
    } catch (e: any) {
      console.error(e);
      if (e.message.startsWith('transaction failed') && /^0x[0-9a-f]{64}$/.test(e.message.split('"')[1])) {
        setError(`Transaction failed, watch in block explorer ${e.message.split('"')[1]}`);
      } else {
        setError(e.message);
      }
    }
    setLoading(false);
  }
  async function onConnect() {
    await window.ethereum.send('eth_requestAccounts')
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const address = await provider.getSigner().getAddress();
    console.log(`Connected to ${address}.`);
    setProvider(provider);
  }
  return (
    <div className="App" style={{maxWidth: 1200, margin: "auto"}}>
      <h1>evm-crispr terminal</h1>
      <AceEditor
        width="100%"
        mode="jade"
        theme="vibrant_ink"
        name="code"
        value={code}
        onLoad={() => console.log('load')}
        onChange={setCode}
        fontSize={24}
        showPrintMargin={true}
        showGutter={true}
        highlightActiveLine={true}
        setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
        }}/>
        <div style={{textAlign: 'right'}}>
          {
            !address ? <input type="button" value="Connect" onClick={onConnect} /> : <input type="button" value={`${loading ? "Forwarding" : "Forward"} from ${addressShortened}`} onClick={onForward} />
          }
        </div>
        <div style={{color: 'red'}}>{error ? "Error: " + error : null}</div>
    </div>
  );
}

export default App;
